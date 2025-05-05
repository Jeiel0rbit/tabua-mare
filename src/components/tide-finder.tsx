/**
 * @fileOverview TideFinder component for selecting state and city (via input) and displaying tide data.
 */
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // Import Input component
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Waves, AlertTriangle, ServerCrash, List, Building } from "lucide-react";
import type { TideData } from "@/services/tabua-de-mares"; // Only TideData is needed from service types
import { fetchTideDataAction } from "@/app/actions"; // Import server action
import { useToast } from "@/hooks/use-toast";

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
    // Special case for São Paulo slug in the URL
    { name: "São Paulo", slug: "sao-paulo", apiSlug: "so-paulo" },
    { name: "Sergipe", slug: "sergipe" },
    { name: "Tocantins", slug: "tocantins" },
].sort((a, b) => a.name.localeCompare(b.name)); // Keep sorted

// --- Utility Function ---
/**
 * Normalizes a string for use in a URL slug.
 * Converts to lowercase, removes accents, replaces spaces with hyphens.
 * @param input The string to normalize.
 * @returns The normalized string slug.
 */
function normalizeToSlug(input: string): string {
    if (!input) return "";
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars except space and hyphen
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
}


export default function TideFinder() {
  // Location Selection State
  const [selectedStateSlug, setSelectedStateSlug] = useState<string>("");
  const [cityName, setCityName] = useState<string>(""); // State for city input

  // Data & UI State
  const [tideData, setTideData] = useState<TideData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // No need for state/city loading transitions anymore
  const [isLoadingTides, startLoadingTides] = useTransition();
  const { toast } = useToast();

  // --- Restore State ---
  // Restore selected state on mount
   useEffect(() => {
    const savedStateSlug = localStorage.getItem(LOCALSTORAGE_STATE_SLUG_KEY);
    if (savedStateSlug && BRAZILIAN_STATES.some(s => s.slug === savedStateSlug)) {
      console.log(`Restoring saved state: ${savedStateSlug}`);
      setSelectedStateSlug(savedStateSlug);
      // Clear city name when restoring state, user needs to re-enter
      setCityName("");
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Run only once on mount

  // --- Data Fetching ---

  // Fetch Tide Data
  const handleFetchTides = () => {
    const stateInfo = BRAZILIAN_STATES.find(s => s.slug === selectedStateSlug);
    const normalizedCityName = cityName.trim(); // Trim whitespace

    if (!stateInfo || !normalizedCityName) {
      setError("Por favor, selecione um estado e digite o nome da cidade.");
      toast({ title: "Seleção Incompleta", description: "Estado e nome da cidade são necessários.", variant: "destructive" });
      return;
    }

    const citySlug = normalizeToSlug(normalizedCityName);
    const stateSlugForApi = stateInfo.apiSlug || stateInfo.slug; // Use special slug for SP if exists

    console.log(`Initiating tide data fetch for: ${citySlug} (${normalizedCityName}), ${stateSlugForApi} (${stateInfo.name})`);
    setError(null);
    setTideData(null);

    startLoadingTides(async () => {
        console.log(`[Transition] Starting tide data fetch for: ${citySlug}, ${stateSlugForApi}`);
        try {
            const data = await fetchTideDataAction(stateSlugForApi, citySlug);
            if (data === null) {
                setError(`Ocorreu um erro ao buscar os dados da maré para ${normalizedCityName}, ${stateInfo.name}. O serviço pode estar indisponível ou o nome da cidade está incorreto.`);
                toast({ title: "Erro de Rede/Servidor ou Cidade Inválida", description: `Não foi possível buscar os dados da maré para ${normalizedCityName}. Verifique o nome da cidade.`, variant: "destructive" });
                setTideData(null);
            } else if (data.length === 0) {
                setError(`Não foram encontrados dados de maré para ${normalizedCityName}, ${stateInfo.name}. Verifique se é uma cidade costeira ou com dados disponíveis.`);
                setTideData([]);
                toast({ title: "Dados Não Encontrados", description: `Nenhuma informação de maré para ${normalizedCityName}, ${stateInfo.name}.`, variant: "default" });
            } else {
                setTideData(data);
                toast({ title: "Dados Carregados!", description: `Tábua de marés para ${normalizedCityName}, ${stateInfo.name}.`, });
            }
        } catch (transitionError) {
            console.error(`[Transition] Error during tide data fetch transition for ${citySlug}, ${stateSlugForApi}:`, transitionError);
            setError("Erro interno ao iniciar busca de dados da maré.");
            toast({ title: "Erro Interno", description: "Falha ao iniciar a busca de dados da maré.", variant: "destructive" });
            setTideData(null);
        } finally {
             console.log(`[Transition] Tide data fetch transition finished for: ${citySlug}, ${stateSlugForApi}.`);
        }
    });
  };


  // --- Event Handlers ---

  const handleStateChange = (value: string) => {
    console.log(`State selected: ${value}`);
    setSelectedStateSlug(value);
    setCityName(""); // Reset city name when state changes
    setTideData(null); // Clear previous results
    setError(null);
    if (value) {
      localStorage.setItem(LOCALSTORAGE_STATE_SLUG_KEY, value);
    } else {
       localStorage.removeItem(LOCALSTORAGE_STATE_SLUG_KEY);
    }
  };

  const handleCityInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCityName(event.target.value);
     // Clear errors/data if user starts typing a new city
     if (tideData !== null || error !== null) {
        setTideData(null);
        setError(null);
     }
  };

  // --- Helper Functions ---
   const getSelectedStateName = (slug: string): string => BRAZILIAN_STATES.find(s => s.slug === slug)?.name || slug;
   // No need for getSelectedCityName, we use the raw cityName state

   // --- Render Logic ---
   const isCurrentlyLoading = isLoadingTides;
   const canFetchTides = selectedStateSlug && cityName.trim() && !isCurrentlyLoading;
   const showNoTidesFoundMessage = tideData?.length === 0 && !isCurrentlyLoading && !error;
   const showInitialPrompt = tideData === null && !isCurrentlyLoading && !error && (!selectedStateSlug || !cityName.trim());
   const showReadyToFetchPrompt = tideData === null && !isCurrentlyLoading && !error && selectedStateSlug && cityName.trim();
   const currentSelectedStateName = selectedStateSlug ? getSelectedStateName(selectedStateSlug) : "";
   const currentCityNameTrimmed = cityName.trim();


  return (
    <Card className="w-full max-w-2xl shadow-lg rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <MapPin />
          Selecione a Localização
        </CardTitle>
        <CardDescription>
          Escolha o estado, digite a cidade e veja a tábua de marés. Dados de <a href="https://tabuademares.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">tabuademares.com</a>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* State Selector */}
            <div className="space-y-1">
            <label htmlFor="state-select" className="text-sm font-medium text-foreground/80">Estado</label>
            <Select
                value={selectedStateSlug}
                onValueChange={handleStateChange}
                // No need to disable based on loading states anymore
            >
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
                <label htmlFor="city-input" className="text-sm font-medium text-foreground/80">Cidade</label>
                <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="city-input"
                        type="text"
                        placeholder={selectedStateSlug ? "Digite o nome da cidade" : "Selecione um estado primeiro"}
                        value={cityName}
                        onChange={handleCityInputChange}
                        disabled={!selectedStateSlug || isLoadingTides}
                        className="pl-9" // Add padding for the icon
                        aria-label="Nome da Cidade"
                    />
                 </div>
            </div>
        </div>


        <Button
            onClick={handleFetchTides} // Directly call handleFetchTides
            disabled={!canFetchTides} // Disable if cannot fetch
            className="w-full bg-primary hover:bg-primary/90 mt-2 rounded-lg"
            aria-live="polite"
        >
          {isLoadingTides ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando Marés...</>
          ) : (
            <><Waves className="mr-2 h-4 w-4" /> Ver Tábua de Marés</>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-6 rounded-lg">
             <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

         {/* Loading Tides Indicator */}
        {isLoadingTides && (
            <div className="mt-8 flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando dados da maré...
            </div>
        )}


        {/* Tide Data Table */}
        {tideData && tideData.length > 0 && !isLoadingTides && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
               <Waves className="text-primary"/> Tábua de Marés para {currentCityNameTrimmed}, {currentSelectedStateName} (Hoje)
            </h2>
            <Table className="rounded-md border">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Hora</TableHead>
                  <TableHead className="text-right">Altura (Metros)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tideData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.time}</TableCell>
                    <TableCell className="text-right">{data.height}m</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             <p className="text-xs text-muted-foreground mt-2 text-center">Valores de altura aproximados.</p>
          </div>
        )}

        {/* Informational Messages */}
         {showNoTidesFoundMessage && (
             <Alert className="mt-6 rounded-lg">
                 <List className="h-4 w-4"/>
                 <AlertTitle>Sem Dados de Maré</AlertTitle>
                 <AlertDescription>
                    Não foram encontrados dados de maré para {currentCityNameTrimmed}, {currentSelectedStateName}. Verifique o nome da cidade e se ela é costeira ou possui dados disponíveis no serviço de origem.
                 </AlertDescription>
             </Alert>
         )}
          {showReadyToFetchPrompt && (
             <div className="mt-6 text-center text-muted-foreground py-4 px-2 border border-dashed rounded-lg">
                 Clique no botão <span className="font-medium">"Ver Tábua de Marés"</span> para carregar os dados para <span className="font-medium">{currentCityNameTrimmed}, {currentSelectedStateName}</span>.
             </div>
         )}
         {showInitialPrompt && (
             <div className="mt-6 text-center text-muted-foreground py-4 px-2 border border-dashed rounded-lg">
                 Selecione um estado e digite o nome da cidade acima para buscar a tábua de marés.
             </div>
         )}
         {/* Handles the case where something fundamental failed - less likely now */}
         {/* {BRAZILIAN_STATES.length === 0 && !isCurrentlyLoading && error && ( */}
         {/* The above condition is unlikely as states are static */}
         {error && !isLoadingTides && tideData === null && ( // Show generic error if fetch failed and it's not a "no data" scenario
             <Alert variant="destructive" className="mt-6 rounded-lg">
                 <ServerCrash className="h-4 w-4"/>
                 <AlertTitle>Falha na Busca</AlertTitle>
                 <AlertDescription>
                    {error}
                 </AlertDescription>
             </Alert>
         )}
      </CardContent>
    </Card>
  );
}
