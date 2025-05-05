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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { useMemo } from 'react';

interface TideChartProps {
  tideData: DailyTideInfo[];
  monthYear: string | null; // e.g., "maio de 2025"
  tideChartSvg: string | null; // Prop for static SVG chart content
}

// Updated ChartDataPoint to use timestamp and store original Date
interface ChartDataPoint {
  timestamp: number; // Use timestamp for Recharts X-axis
  height: number;
  type: 'high' | 'low';
  dayOfMonth: number;
  originalDateTime: Date; // Keep original Date for formatting
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
    // console.warn(`[TideChart] Could not parse time '${timeStr}' or month/year '${monthYearStr}'`); // Reduced noise
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

  // Check if the date is valid
  if (isNaN(date.getTime())) {
      console.warn(`[TideChart] Invalid date created for day ${day}, time ${timeStr}, month/year ${monthYearStr}`);
      return null;
  }
  return date;
}

// Format X-axis ticks from timestamp to show Day/Time
const formatXAxis = (timestamp: number): string => {
    const date = new Date(timestamp);
    // Show 'Day X HH:MM' format
    return `${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

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

          // Ensure dateTime is valid and has a valid timestamp before pushing
          if (dateTime && !isNaN(dateTime.getTime()) && !isNaN(height)) {
            let type: 'high' | 'low' = 'low';
            if (previousHeight !== null) {
              type = height > previousHeight ? 'high' : 'low';
            }
            dataPoints.push({
              timestamp: dateTime.getTime(), // Use timestamp for chart data
              height,
              type,
              dayOfMonth: dayInfo.dayOfMonth,
              originalDateTime: dateTime // Store original date
            });
            previousHeight = height;
          } else {
              // Log if a point is skipped due to invalid date/time or height
              console.warn(`[TideChart] Skipping data point: Day=${dayInfo.dayOfMonth}, Time=${tide?.time}, Height=${tide?.height}. Reason: Invalid dateTime, timestamp, or height.`);
          }
        }
      });
    });

    // Sort by timestamp
    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
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
  const yDomainPadding = 0.2;
  const yDomain = [Math.min(0, Math.floor(minY - yDomainPadding)), Math.ceil(maxY + yDomainPadding)];


  return (
     <div className="mt-8">
         <h3 className="text-xl font-semibold text-center mb-4 text-primary">Gráfico de Marés (Interativo)</h3>
        <ChartContainer config={chartConfig} className="aspect-video h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: -20, bottom: 40 }}
            >
             <defs>
                <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
                dataKey="timestamp" // Use timestamp for dataKey
                tickFormatter={formatXAxis} // Use the custom formatter
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={50}
                />
            <YAxis
                dataKey="height"
                domain={yDomain}
                tickFormatter={(value) => `${value}m`}
                tick={{ fontSize: 10 }}
                width={40}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip
                cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, fill: 'hsl(var(--accent) / 0.1)' }}
                content={
                <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label, payload) => {
                    // Use originalDateTime from payload for formatting
                    if (payload && payload.length > 0 && payload[0].payload.originalDateTime) {
                        const date = payload[0].payload.originalDateTime;
                        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        return `${formattedDate} ${formattedTime}`;
                    }
                    // Fallback using timestamp if originalDateTime is missing
                    if (typeof label === 'number') {
                         return formatXAxis(label);
                    }
                    return String(label); // Fallback to default label
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
            <Area
                type="monotone"
                dataKey="height"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tideGradient)"
                dot={(props) => {
                    const { cx, cy, stroke, payload, index } = props as any;
                    const isHighTide = payload.type === 'high';
                    // Use timestamp in the key for uniqueness
                    const key = `${index}-${payload.timestamp}`;
                    return (
                        <Dot
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isHighTide ? "hsl(var(--accent))" : "hsl(var(--chart-1))"}
                        stroke={"hsl(var(--background))"}
                        strokeWidth={1.5}
                        />
                    );
                }}
                activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            </AreaChart>
        </ResponsiveContainer>
        </ChartContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">Passe o mouse sobre os pontos para detalhes.</p>
    </div>
  );
}
