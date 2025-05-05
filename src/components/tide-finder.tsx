/**
 * @fileOverview TideFinder component for selecting state and city (via input) and displaying detailed tide data.
 */
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Image from 'next/image'; // Import next/image
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Waves, AlertTriangle, ServerCrash, List, Building, Sun, Moon, Info, ThermometerSnowflake, CalendarDays, Hash } from "lucide-react";
import type { ScrapedPageData, DailyTideInfo, TideEvent } from "@/services/tabua-de-mares"; // Import new types
import { fetchTideDataAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import TideChart from '@/components/tide-chart'; // Import the new chart component

// --- Constants ---
const LOCALSTORAGE_STATE_SLUG_KEY = "selectedStateSlug";
// No need for city slug storage anymore as it's typed

// --- Static State Data ---
interface StateInfo {
  name: string;
  slug: string;
  /** Special slug used specifically for the API/URL if different */
  apiSlug?: string;
}

const BRAZILIAN_STATES: StateInfo[] = [
    { name: "Acre", slug: "acre" },
    { name: "Alagoas", slug: "alagoas" },
    { name: "Amapá", slug: "amapa" },
    { name: "Amazonas", slug: "amazonas" },
    { name: "Bahia", slug: "bahia" },
    { name: "Ceará", slug: "ceara" },
    { name: "Distrito Federal", slug: "distrito-federal" },
    { name: "Espírito Santo", slug: "espirito-santo" },
    { name: "Goiás", slug: "goias" },
    { name: "Maranhão", slug: "maranhao" },
    { name: "Mato Grosso", slug: "mato-grosso" },
    { name: "Mato Grosso do Sul", slug: "mato-grosso-do-sul" },
    { name: "Minas Gerais", slug: "minas-gerais" },
    { name: "Pará", slug: "para" },
    { name: "Paraíba", slug: "paraiba" },
    { name: "Paraná", slug: "parana" },
    { name: "Pernambuco", slug: "pernambuco" },
    { name: "Piauí", slug: "piaui" },
    { name: "Rio de Janeiro", slug: "rio-de-janeiro" },
    { name: "Rio Grande do Norte", slug: "rio-grande-do-norte" },
    { name: "Rio Grande do Sul", slug: "rio-grande-do-sul" },
    { name: "Rondônia", slug: "rondonia" },
    { name: "Roraima", slug: "roraima" },
    { name: "Santa Catarina", slug: "santa-catarina" },
    { name: "São Paulo", slug: "sao-paulo", apiSlug: "so-paulo" },
    { name: "Sergipe", slug: "sergipe" },
    { name: "Tocantins", slug: "tocantins" },
].sort((a, b) => a.name.localeCompare(b.name));

// --- Utility Function ---
function normalizeToSlug(input: string): string {
    if (!input) return "";
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
}

// --- Helper Component for Tide Event ---
const TideEventDisplay = ({ tide, label }: { tide: TideEvent | null, label: string }) => {
    // Check if tide object exists and has valid time and height
    if (!tide || tide.time === null || tide.height === null) {
        return <TableCell className="text-muted-foreground text-xs italic text-center">N/A</TableCell>;
    }
    return (
        <TableCell className="text-center">
            <span className="font-medium block">{tide.time}</span>
            <span className="text-sm text-muted-foreground">{tide.height}m</span>
        </TableCell>
    );
};


export default function TideFinder() {
  // Location Selection State
  const [selectedStateSlug, setSelectedStateSlug] = useState<string>("");
  const [cityName, setCityName] = useState<string>("");

  // Data & UI State
  const [scrapedData, setScrapedData] = useState<ScrapedPageData | null>(null); // Use new state name and type
  const [error, setError] = useState<string | null>(null);
  const [isLoadingTides, startLoadingTides] = useTransition();
  const { toast } = useToast();

   // --- Restore State ---
   useEffect(() => {
    const savedStateSlug = localStorage.getItem(LOCALSTORAGE_STATE_SLUG_KEY);
    if (savedStateSlug && BRAZILIAN_STATES.some(s => s.slug === savedStateSlug)) {
      console.log(`Restoring saved state: ${savedStateSlug}`);
      setSelectedStateSlug(savedStateSlug);
      setCityName(""); // Clear city on state restore
    }
   }, []); // Run only once on mount

  // --- Data Fetching ---
  const handleFetchTides = () => {
    const stateInfo = BRAZILIAN_STATES.find(s => s.slug === selectedStateSlug);
    const normalizedCityName = cityName.trim();

    if (!stateInfo || !normalizedCityName) {
      setError("Por favor, selecione um estado e digite o nome da cidade.");
      toast({ title: "Seleção Incompleta", description: "Estado e nome da cidade são necessários.", variant: "destructive" });
      setScrapedData(null); // Clear old data
      return;
    }

    const citySlug = normalizeToSlug(normalizedCityName);
    const stateSlugForApi = stateInfo.apiSlug || stateInfo.slug;

    console.log(`Initiating detailed tide data fetch for: ${citySlug} (${normalizedCityName}), ${stateSlugForApi} (${stateInfo.name})`);
    setError(null);
    setScrapedData(null); // Clear previous results

    startLoadingTides(async () => {
        console.log(`[Transition] Starting detailed tide data fetch for: ${citySlug}, ${stateSlugForApi}`);
        try {
            const data = await fetchTideDataAction(stateSlugForApi, citySlug);
            if (data === null) {
                // Critical fetch/parse error scenario
                setError(`Ocorreu um erro crítico ao buscar os dados da maré para ${normalizedCityName}, ${stateInfo.name}. O serviço pode estar indisponível ou houve um problema na interpretação dos dados.`);
                toast({ title: "Erro de Rede/Servidor", description: `Não foi possível buscar os dados da maré para ${normalizedCityName}.`, variant: "destructive" });
                setScrapedData(null);
            } else if (data.dailyTides.length === 0) {
                 // Successful fetch, but no tide table or rows found
                setError(`Não foram encontrados dados de maré detalhados para ${normalizedCityName}, ${stateInfo.name}. Verifique se é uma cidade costeira com dados disponíveis no formato esperado ou se o nome está correto.`);
                setScrapedData(data); // Keep data to show header/context if available
                toast({ title: "Dados Não Encontrados", description: `Nenhuma informação detalhada de maré para ${normalizedCityName}, ${stateInfo.name}.`, variant: "default" });
            } else {
                // Success!
                setScrapedData(data);
                toast({ title: "Dados Carregados!", description: `Tábua de marés detalhada para ${normalizedCityName}, ${stateInfo.name}.`, });
            }
        } catch (transitionError) {
            console.error(`[Transition] Error during detailed tide data fetch transition for ${citySlug}, ${stateSlugForApi}:`, transitionError);
            setError("Erro interno ao iniciar busca de dados da maré.");
            toast({ title: "Erro Interno", description: "Falha ao iniciar a busca de dados da maré.", variant: "destructive" });
            setScrapedData(null);
        } finally {
             console.log(`[Transition] Detailed tide data fetch transition finished for: ${citySlug}, ${stateSlugForApi}.`);
        }
    });
  };


  // --- Event Handlers ---
  const handleStateChange = (value: string) => {
    console.log(`State selected: ${value}`);
    setSelectedStateSlug(value);
    setCityName("");
    setScrapedData(null); // Clear results on state change
    setError(null);
    if (value) {
      localStorage.setItem(LOCALSTORAGE_STATE_SLUG_KEY, value);
    } else {
       localStorage.removeItem(LOCALSTORAGE_STATE_SLUG_KEY);
    }
  };

  const handleCityInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCityName(event.target.value);
     if (scrapedData !== null || error !== null) {
        setScrapedData(null);
        setError(null);
     }
  };

  // --- Helper Functions ---
   const getSelectedStateName = (slug: string): string => BRAZILIAN_STATES.find(s => s.slug === slug)?.name || slug;

   // --- Render Logic ---
   const isCurrentlyLoading = isLoadingTides;
   const canFetchTides = selectedStateSlug && cityName.trim() && !isCurrentlyLoading;
   // Show "no data found" if fetch was successful (scrapedData is not null) but dailyTides is empty
   const showNoTidesFoundMessage = scrapedData !== null && scrapedData.dailyTides.length === 0 && !isCurrentlyLoading && !error;
   const showResults = scrapedData !== null && scrapedData.dailyTides.length > 0 && !isCurrentlyLoading;
   const showInitialPrompt = scrapedData === null && !isCurrentlyLoading && !error && (!selectedStateSlug || !cityName.trim());
   const showReadyToFetchPrompt = scrapedData === null && !isCurrentlyLoading && !error && selectedStateSlug && cityName.trim();
   const currentSelectedStateName = selectedStateSlug ? getSelectedStateName(selectedStateSlug) : "";
   const currentCityNameTrimmed = cityName.trim();
   // Show generic error only if scrapedData is null (fetch failed critically) and not loading
   const showGenericError = error !== null && scrapedData === null && !isCurrentlyLoading;


  return (
    <Card className="w-full max-w-4xl shadow-lg rounded-xl"> {/* Increased max-width */}
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <MapPin />
          Selecione a Localização
        </CardTitle>
        <CardDescription>
          Escolha o estado, digite a cidade e veja a tábua de marés detalhada. Dados de <a href="https://tabuademares.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">tabuademares.com</a>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Location Selection Row */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* State Selector */}
            <div className="space-y-1">
                <label htmlFor="state-select" className="text-sm font-medium text-foreground/80 flex items-center gap-1"><List className="h-4 w-4"/> Estado</label>
                <Select value={selectedStateSlug} onValueChange={handleStateChange} disabled={isLoadingTides}>
                    <SelectTrigger id="state-select" aria-label="Selecionar Estado">
                        <SelectValue placeholder="Selecione o Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                            <SelectItem key={state.slug} value={state.slug}>
                                {state.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* City Input */}
            <div className="space-y-1">
                <label htmlFor="city-input" className="text-sm font-medium text-foreground/80 flex items-center gap-1"><Building className="h-4 w-4"/> Cidade</label>
                <Input
                    id="city-input"
                    type="text"
                    placeholder={selectedStateSlug ? "Digite o nome da cidade" : "Selecione um estado"}
                    value={cityName}
                    onChange={handleCityInputChange}
                    disabled={!selectedStateSlug || isLoadingTides}
                    aria-label="Nome da Cidade"
                    className="w-full"
                />
            </div>

            {/* Fetch Button */}
             <div className="flex items-end">
                <Button
                    onClick={handleFetchTides}
                    disabled={!canFetchTides}
                    className="w-full bg-primary hover:bg-primary/90 rounded-lg"
                    aria-live="polite"
                >
                {isLoadingTides ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</>
                ) : (
                    <><Waves className="mr-2 h-4 w-4" /> Ver Tábua de Marés</>
                )}
                </Button>
            </div>
        </div>

        {/* --- Display Area --- */}

        {/* Loading Indicator */}
        {isLoadingTides && (
            <div className="mt-8 flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                <p>Carregando dados detalhados da maré para</p>
                <p className="font-semibold">{currentCityNameTrimmed}, {currentSelectedStateName}...</p>
            </div>
        )}

        {/* Error Display */}
        {error && (showGenericError || showNoTidesFoundMessage) && ( // Combine error display logic
          <Alert variant={showGenericError ? "destructive" : "default"} className="mt-6 rounded-lg">
             {showGenericError ? <ServerCrash className="h-4 w-4" /> : <List className="h-4 w-4" />}
            <AlertTitle>{showGenericError ? "Falha na Busca" : "Sem Dados de Maré"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {/* Detailed Tide Data Table & Chart */}
        {showResults && scrapedData && (
          <div className="mt-8 space-y-6">
             {/* Location Header & Month/Year */}
             <div className="text-center">
                 {scrapedData.locationHeader && (
                     <h2 className="text-2xl font-semibold text-primary flex items-center justify-center gap-2">
                       <Waves /> {scrapedData.locationHeader}
                     </h2>
                 )}
                  {scrapedData.monthYearText && (
                     <p className="text-muted-foreground mt-1">{scrapedData.monthYearText}</p>
                 )}
             </div>


            {/* Context/Activity Text */}
            {scrapedData.pageContextText && (
                <Alert variant="default" className="rounded-lg bg-secondary">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Informações Adicionais</AlertTitle>
                    <AlertDescription>{scrapedData.pageContextText}</AlertDescription>
                </Alert>
             )}

            {/* Daily Tides Table */}
            <Table className="rounded-md border shadow-md">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px] text-center"><CalendarDays className="inline-block h-4 w-4 mr-1"/> Dia</TableHead>
                  <TableHead className="w-[100px] text-center"><Sun className="inline-block h-4 w-4 mr-1"/> Sol</TableHead>
                  <TableHead className="text-center">1ª Maré</TableHead>
                  <TableHead className="text-center">2ª Maré</TableHead>
                  <TableHead className="text-center">3ª Maré</TableHead>
                  <TableHead className="text-center">4ª Maré</TableHead>
                  <TableHead className="w-[100px] text-center"><Hash className="inline-block h-4 w-4 mr-1"/> Coeficiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrapedData.dailyTides.map((data, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? "" : "bg-secondary/30"}>
                    <TableCell className="font-medium text-center">{data.dayOfMonth}<br/><span className="text-xs text-muted-foreground">{data.dayOfWeek}</span></TableCell>
                    <TableCell className="text-center text-xs">
                      <span className="flex items-center justify-center gap-1">
                         <Sun className="h-3 w-3 text-orange-400"/> {data.sunriseTime ?? '-'} <span className="text-muted-foreground">↑</span>
                      </span>
                       <span className="flex items-center justify-center gap-1">
                         <Moon className="h-3 w-3 text-blue-400"/> {data.sunsetTime ?? '-'} <span className="text-muted-foreground">↓</span>
                       </span>
                    </TableCell>
                    <TideEventDisplay tide={data.tide1} label="1ª Maré" />
                    <TideEventDisplay tide={data.tide2} label="2ª Maré" />
                    <TideEventDisplay tide={data.tide3} label="3ª Maré" />
                    <TideEventDisplay tide={data.tide4} label="4ª Maré" />
                    <TableCell className="text-center text-sm">
                      {data.coefficient ? (
                        <span dangerouslySetInnerHTML={{ __html: data.coefficient.replace(/(\d+)/, '<span class="font-bold">$1</span>') }} />
                      ) : (
                        <span className="text-muted-foreground text-xs italic">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             <p className="text-xs text-muted-foreground mt-2 text-center">Valores de altura aproximados. Verifique sempre as condições locais.</p>

             {/* Tide Chart */}
             <div className="mt-8">
                <h3 className="text-xl font-semibold text-center mb-4">Gráfico de Marés</h3>
                <TideChart tideData={scrapedData.dailyTides} monthYear={scrapedData.monthYearText} tideChartSvg={null} /> {/* Removed tideChartSvg prop */}
             </div>
          </div>
        )}

        {/* Informational Prompts */}
         {showReadyToFetchPrompt && (
             <div className="mt-6 text-center text-muted-foreground py-4 px-2 border border-dashed rounded-lg bg-card">
                 Pronto para buscar! Clique em <span className="font-medium text-primary">"Ver Tábua de Marés"</span> para carregar os dados para <span className="font-medium">{currentCityNameTrimmed}, {currentSelectedStateName}</span>.
             </div>
         )}
         {showInitialPrompt && (
             <div className="mt-6 text-center text-muted-foreground py-4 px-2 border border-dashed rounded-lg bg-card">
                 Selecione um estado e digite o nome de uma cidade costeira para buscar a tábua de marés detalhada.
             </div>
         )}

      </CardContent>
    </Card>
  );
}
