/**
 * @fileOverview TideChart component for visualizing daily tide data.
 */
"use client";

import type { DailyTideInfo, TideEvent } from '@/services/tabua-de-mares';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { useMemo } from 'react';

interface TideChartProps {
  tideData: DailyTideInfo[];
  monthYear: string | null; // e.g., "maio de 2025"
  tideChartSvg: string | null; // New prop for SVG content
}

interface ChartDataPoint {
  dateTime: Date;
  height: number;
  type: 'high' | 'low'; // Add type to distinguish high/low
  dayOfMonth: number;
}

const chartConfig = {
  height: {
    label: "Altura (m)",
    color: "hsl(var(--chart-1))", // Use primary color from theme
  },
} satisfies ChartConfig;

// Helper function to convert HH:MM time string and day to a Date object for a given month/year
function parseTideTime(day: number, timeStr: string, monthYearStr: string | null): Date | null {
  if (!timeStr || !monthYearStr) return null;

  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  const monthYearMatch = monthYearStr.match(/(\w+) de (\d{4})/);

  if (!timeMatch || !monthYearMatch) {
    console.warn(`[TideChart] Could not parse time '${timeStr}' or month/year '${monthYearStr}'`);
    return null;
  }

  const [, hours, minutes] = timeMatch;
  const [, monthName, year] = monthYearMatch;

  const monthMap: { [key: string]: number } = {
    janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  };

  const monthIndex = monthMap[monthName.toLowerCase()];
  if (monthIndex === undefined) {
    console.warn(`[TideChart] Unknown month name: '${monthName}'`);
    return null;
  }

  // Create date in local timezone. Recharts typically handles Date objects correctly.
  const date = new Date(parseInt(year, 10), monthIndex, day, parseInt(hours, 10), parseInt(minutes, 10));

  // Check if the date is valid (e.g., handles Feb 29 in non-leap years, etc.)
  if (isNaN(date.getTime())) {
      console.warn(`[TideChart] Invalid date created for day ${day}, time ${timeStr}, month/year ${monthYearStr}`);
      return null;
  }
  return date;
}

export default function TideChart({ tideData, monthYear, tideChartSvg }: TideChartProps) {
  const chartData = useMemo(() => {
    const dataPoints: ChartDataPoint[] = [];
    let previousHeight: number | null = null;

    tideData.forEach(dayInfo => {
      const tides: (TideEvent | null)[] = [dayInfo.tide1, dayInfo.tide2, dayInfo.tide3, dayInfo.tide4];
      tides.forEach(tide => {
        if (tide && tide.time && tide.height) {
          const dateTime = parseTideTime(dayInfo.dayOfMonth, tide.time, monthYear);
          const height = parseFloat(tide.height);
          if (dateTime && !isNaN(height)) {
            // Determine type based on comparison with previous valid height
            let type: 'high' | 'low' = 'low'; // Default to low if no previous point
            if (previousHeight !== null) {
              type = height > previousHeight ? 'high' : 'low';
            }
            dataPoints.push({ dateTime, height, type, dayOfMonth: dayInfo.dayOfMonth });
            previousHeight = height; // Update previous height for next comparison
          }
        }
      });
    });

    // Sort by date just in case they weren't perfectly ordered
    return dataPoints.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [tideData, monthYear]);

  // --- Render SVG Chart if available ---
  if (tideChartSvg) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-center mb-4 text-primary">Gráfico de Marés (Visualização Rápida)</h3>
        <div
          className="w-full h-auto [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: tideChartSvg }}
        />
         <p className="text-xs text-muted-foreground mt-2 text-center">Este é um gráfico estático. Para interatividade, use a tabela acima.</p>
      </div>
    );
  }

  // --- Render Interactive Chart if SVG is not available ---
   if (!chartData.length) {
    return <p className="text-center text-muted-foreground">Não há dados suficientes para gerar o gráfico interativo.</p>;
  }

  // Calculate min/max height for Y-axis domain
  const heights = chartData.map(d => d.height);
  const minY = Math.min(...heights);
  const maxY = Math.max(...heights);
  const yDomainPadding = 0.2; // Add some padding
  const yDomain = [Math.floor(minY - yDomainPadding), Math.ceil(maxY + yDomainPadding)];

  // Format X-axis ticks to show Day/Time
  const formatXAxis = (tickItem: Date) => {
    // Show 'Day X HH:MM' format
    return `${tickItem.getDate()} ${tickItem.getHours().toString().padStart(2, '0')}:${tickItem.getMinutes().toString().padStart(2, '0')}`;
  };


  return (
     <div className="mt-8">
         <h3 className="text-xl font-semibold text-center mb-4 text-primary">Gráfico de Marés (Interativo)</h3>
        <ChartContainer config={chartConfig} className="aspect-video h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: -20, bottom: 40 }} // Adjusted margins
            >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
                dataKey="dateTime"
                tickFormatter={formatXAxis} // Use the custom formatter
                type="number" // Treat dateTime as numbers (timestamps)
                scale="time"
                domain={['dataMin', 'dataMax']}
                angle={-45} // Angle ticks for better readability
                textAnchor="end" // Align angled ticks
                height={60} // Increase height for angled labels
                tick={{ fontSize: 10 }} // Smaller font size for ticks
                interval="preserveStartEnd" // Ensure first and last ticks are shown
                // Consider dynamically setting ticks if too crowded:
                // ticks={chartData.map(d => d.dateTime.getTime())} // Show a tick for every data point
                minTickGap={50} // Minimum gap between ticks
                />
            <YAxis
                dataKey="height"
                domain={yDomain}
                tickFormatter={(value) => `${value}m`}
                tick={{ fontSize: 10 }} // Smaller font size for ticks
                width={40} // Adjust width for Y-axis labels
            />
            <Tooltip
                cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1 }}
                content={
                <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0 && payload[0].payload.dateTime) {
                        const date = new Date(payload[0].payload.dateTime);
                        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        return `${formattedDate} ${formattedTime}`;
                    }
                    return label;
                    }}
                    formatter={(value, name, props) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{value}m</span>
                        <span className="text-xs text-muted-foreground">
                            {props.payload?.type === 'high' ? 'Maré Alta' : 'Maré Baixa'}
                        </span>
                    </div>
                    )}
                />
                }
            />
            <Line
                type="monotone"
                dataKey="height"
                stroke="hsl(var(--chart-1))" // Primary color
                strokeWidth={2}
                dot={(props) => {
                const { cx, cy, stroke, payload, index } = props as any; // Cast to any to access payload easily
                const isHighTide = payload.type === 'high';
                // Use a unique key, combining index and dateTime just to be safe
                const key = `${index}-${payload.dateTime?.getTime()}`;
                return (
                    <Dot
                      key={key} // Add unique key here
                      cx={cx}
                      cy={cy}
                      r={4} // Dot radius
                      fill={isHighTide ? "hsl(var(--accent))" : "hsl(var(--chart-1))"} // Coral for high tide, blue for low
                      stroke={stroke}
                      strokeWidth={1}
                    />
                );
                }}
                activeDot={{ r: 6 }}
            />
            {/* Optional: Add a reference line at 0m */}
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            </LineChart>
        </ResponsiveContainer>
        </ChartContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">Passe o mouse sobre os pontos para detalhes.</p>
    </div>
  );
}

