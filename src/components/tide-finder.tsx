/**
 * @fileOverview TideFinder component for selecting location and displaying tide data.
 */
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Waves, AlertTriangle, ServerCrash, List } from "lucide-react";
import type { TideData, StateInfo, CityInfo } from "@/services/tabua-de-mares";
import { fetchTideDataAction, fetchStatesAction, fetchCitiesAction } from "@/app/actions"; // Import server actions
import { useToast } from "@/hooks/use-toast";

const LOCALSTORAGE_STATE_SLUG_KEY = "selectedStateSlug";
const LOCALSTORAGE_CITY_SLUG_KEY = "selectedCitySlug";

export default function TideFinder() {
  // Location Selection State
  const [states, setStates] = useState<StateInfo[]>([]);
  const [selectedStateSlug, setSelectedStateSlug] = useState<string>("");
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>("");

  // Data & UI State
  const [tideData, setTideData] = useState<TideData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStates, startLoadingStates] = useTransition();
  const [isLoadingCities, startLoadingCities] = useTransition();
  const [isLoadingTides, startLoadingTides] = useTransition();
  const { toast } = useToast();

  // --- Data Fetching ---

  // Fetch States
  const loadStates = useCallback(() => {
    console.log("Initiating state fetch...");
    setError(null); // Clear previous errors
    startLoadingStates(async () => {
        console.log("[Transition] Starting state fetch...");
        try {
            const fetchedStates = await fetchStatesAction();
            if (fetchedStates) {
                setStates(fetchedStates);
                console.log(`Loaded ${fetchedStates.length} states.`);
                // Try to restore saved state selection after states are loaded
                const savedStateSlug = localStorage.getItem(LOCALSTORAGE_STATE_SLUG_KEY);
                if (savedStateSlug && fetchedStates.some(s => s.slug === savedStateSlug)) {
                console.log(`Restoring saved state: ${savedStateSlug}`);
                setSelectedStateSlug(savedStateSlug); // This will trigger loadCities via useEffect
                } else {
                console.log("No valid saved state found or states list empty.");
                // Optionally select a default state if desired
                // if (fetchedStates.length > 0) setSelectedStateSlug(fetchedStates[0].slug);
                }
            } else {
                setError("Não foi possível carregar a lista de estados. Verifique sua conexão ou tente novamente.");
                toast({ title: "Erro ao Carregar Estados", description: "A lista de estados não pôde ser obtida.", variant: "destructive" });
                setStates([]); // Clear states on fetch failure
            }
        } catch (transitionError) {
            // Catch errors specifically within the transition boundary if fetchStatesAction itself throws
            console.error("[Transition] Error during state fetch transition:", transitionError);
            setError("Erro interno ao iniciar busca de estados.");
            toast({ title: "Erro Interno", description: "Falha ao iniciar a busca de estados.", variant: "destructive" });
            setStates([]); // Ensure states is empty
        } finally {
            console.log("[Transition] State fetch transition finished."); // This should always log
        }
    });
  }, [toast]); // Added toast dependency

  // Fetch Cities when State changes
  const loadCities = useCallback((stateSlug: string) => {
    if (!stateSlug) {
      setCities([]);
      setSelectedCitySlug(""); // Clear city selection
      localStorage.removeItem(LOCALSTORAGE_CITY_SLUG_KEY);
      return;
    };
    console.log(`Initiating city fetch for state: ${stateSlug}`);
    setError(null); // Clear previous errors
    setTideData(null); // Clear old tide data
    startLoadingCities(async () => {
        console.log(`[Transition] Starting city fetch for state: ${stateSlug}`);
        try {
            const fetchedCities = await fetchCitiesAction(stateSlug);
            if (fetchedCities) {
                setCities(fetchedCities);
                console.log(`Loaded ${fetchedCities.length} cities for ${stateSlug}.`);
                // Try to restore saved city selection after cities are loaded
                const savedCitySlug = localStorage.getItem(LOCALSTORAGE_CITY_SLUG_KEY);
                const currentSelectedState = localStorage.getItem(LOCALSTORAGE_STATE_SLUG_KEY);
                // Only restore city if it belongs to the currently selected state
                if (stateSlug === currentSelectedState && savedCitySlug && fetchedCities.some(c => c.slug === savedCitySlug)) {
                console.log(`Restoring saved city: ${savedCitySlug} for state ${stateSlug}`);
                setSelectedCitySlug(savedCitySlug);
                // Optionally auto-fetch tides here if both restored
                // handleFetchTides(stateSlug, savedCitySlug);
                } else {
                    console.log(`No valid saved city for ${stateSlug} or state changed.`);
                    setSelectedCitySlug(""); // Clear city if saved one doesn't match or state changed
                    localStorage.removeItem(LOCALSTORAGE_CITY_SLUG_KEY);
                    // Optionally select the first city if desired
                    // if (fetchedCities.length > 0) setSelectedCitySlug(fetchedCities[0].slug);
                }
            } else {
                setError(`Não foi possível carregar a lista de cidades para o estado selecionado. O estado pode não ter cidades suportadas ou ocorreu um erro.`);
                setCities([]); // Ensure cities array is empty on error
                setSelectedCitySlug(""); // Clear city selection on error
                toast({ title: "Erro ao Carregar Cidades", description: "A lista de cidades não pôde ser obtida.", variant: "destructive" });
            }
        } catch (transitionError) {
            console.error(`[Transition] Error during city fetch transition for ${stateSlug}:`, transitionError);
            setError("Erro interno ao iniciar busca de cidades.");
            toast({ title: "Erro Interno", description: "Falha ao iniciar a busca de cidades.", variant: "destructive" });
            setCities([]); // Ensure cities is empty
            setSelectedCitySlug("");
        } finally {
            console.log(`[Transition] City fetch transition finished for state: ${stateSlug}.`); // This should always log
        }
    });
  }, [toast]); // Added toast dependency

  // Fetch Tide Data
  const handleFetchTides = (stateToFetch = selectedStateSlug, cityToFetch = selectedCitySlug) => {
    if (!stateToFetch || !cityToFetch) {
      setError("Por favor, selecione um estado e uma cidade.");
      toast({ title: "Seleção Incompleta", description: "Estado e cidade são necessários.", variant: "destructive" });
      return;
    }
    console.log(`Initiating tide data fetch for: ${cityToFetch}, ${stateToFetch}`);
    setError(null);
    setTideData(null);

    startLoadingTides(async () => {
        console.log(`[Transition] Starting tide data fetch for: ${cityToFetch}, ${stateToFetch}`);
        try {
            const data = await fetchTideDataAction(stateToFetch, cityToFetch);
            if (data === null) { // Explicitly check for null, indicating a fetch/server error
                setError("Ocorreu um erro ao buscar os dados da maré. O serviço pode estar indisponível ou ocorreu um problema no servidor.");
                toast({ title: "Erro de Rede/Servidor", description: "Não foi possível buscar os dados da maré.", variant: "destructive" });
                setTideData(null); // Ensure tideData is null on server error
            } else if (data.length === 0) { // Empty array means scraping was successful but found no data (e.g., table empty, city not coastal)
                setError("Não foram encontrados dados de maré para esta localização. Verifique se é uma cidade costeira ou com dados disponíveis.");
                setTideData([]); // Set to empty array to indicate "no data found" vs "error"
                toast({ title: "Dados Não Encontrados", description: `Nenhuma informação de maré para ${getSelectedCityName(cityToFetch)}, ${getSelectedStateName(stateToFetch)}.`, variant: "default" });
            } else {
                setTideData(data);
                toast({ title: "Dados Carregados!", description: `Tábua de marés para ${getSelectedCityName(cityToFetch)}, ${getSelectedStateName(stateToFetch)}.`, });
            }
        } catch (transitionError) {
            console.error(`[Transition] Error during tide data fetch transition for ${cityToFetch}, ${stateToFetch}:`, transitionError);
            setError("Erro interno ao iniciar busca de dados da maré.");
            toast({ title: "Erro Interno", description: "Falha ao iniciar a busca de dados da maré.", variant: "destructive" });
            setTideData(null); // Clear tide data on internal error
        } finally {
             console.log(`[Transition] Tide data fetch transition finished for: ${cityToFetch}, ${stateToFetch}.`); // This should always log
        }
    });
  };

  // --- Effects ---

  // Load states on initial mount
  useEffect(() => {
    loadStates();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load states only once

  // Load cities when selectedStateSlug changes
  useEffect(() => {
    if (selectedStateSlug) {
      // Ensure we don't try loading cities while states are still loading
      if (!isLoadingStates) {
          loadCities(selectedStateSlug);
      }
    } else {
      setCities([]); // Clear cities if state is deselected
      setSelectedCitySlug("");
      localStorage.removeItem(LOCALSTORAGE_CITY_SLUG_KEY); // Also clear storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStateSlug, isLoadingStates]); // Also depend on isLoadingStates to avoid race condition


  // --- Event Handlers ---

  const handleStateChange = (value: string) => {
    console.log(`State selected: ${value}`);
    if (isLoadingStates || isLoadingCities) return; // Prevent changes during loading
    setSelectedStateSlug(value);
    setSelectedCitySlug(""); // Reset city when state changes
    setTideData(null); // Clear previous results
    setError(null);
    localStorage.setItem(LOCALSTORAGE_STATE_SLUG_KEY, value);
    localStorage.removeItem(LOCALSTORAGE_CITY_SLUG_KEY); // Remove old city on state change
    // City loading is handled by useEffect watching selectedStateSlug and isLoadingStates
  };

  const handleCityChange = (value: string) => {
    console.log(`City selected: ${value}`);
     if (isLoadingCities || isLoadingTides) return; // Prevent changes during loading
    setSelectedCitySlug(value);
    setTideData(null); // Clear previous results
    setError(null);
    if (value) {
      localStorage.setItem(LOCALSTORAGE_CITY_SLUG_KEY, value);
    } else {
      localStorage.removeItem(LOCALSTORAGE_CITY_SLUG_KEY);
    }
  };

  // --- Helper Functions ---
   const getSelectedStateName = (slug: string): string => states.find(s => s.slug === slug)?.name || slug;
   const getSelectedCityName = (slug: string): string => cities.find(c => c.slug === slug)?.name || slug;

   // --- Render Logic ---
   const isCurrentlyLoading = isLoadingStates || isLoadingCities || isLoadingTides;
   const showStateSelector = !isLoadingStates || states.length > 0; // Show if not loading OR if already has states
   const showCitySelector = !isLoadingCities || cities.length > 0; // Show if not loading OR if already has cities
   const canFetchTides = selectedStateSlug && selectedCitySlug && !isCurrentlyLoading;
   const showNoTidesFoundMessage = tideData && tideData.length === 0 && !isCurrentlyLoading && !error;
   const showInitialPrompt = tideData === null && !isCurrentlyLoading && !error && (!selectedStateSlug || !selectedCitySlug);
   const showReadyToFetchPrompt = tideData === null && !isCurrentlyLoading && !error && selectedStateSlug && selectedCitySlug;


  return (
    <Card className="w-full max-w-2xl shadow-lg rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <MapPin />
          Selecione a Localização
        </CardTitle>
        <CardDescription>
          Escolha o estado e a cidade para ver a tábua de marés. Dados de <a href="https://tabuademares.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">tabuademares.com</a>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Loading States Indicator */}
        {isLoadingStates && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando estados...
            </div>
        )}

        {/* State Selector */}
         {showStateSelector && (
             <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                 <div className="space-y-1">
                    <label htmlFor="state-select" className="text-sm font-medium text-foreground/80">Estado</label>
                    <Select
                    value={selectedStateSlug}
                    onValueChange={handleStateChange}
                    disabled={isLoadingStates || states.length === 0} // Disable while loading states
                    >
                    <SelectTrigger id="state-select" aria-label="Selecionar Estado">
                        <SelectValue placeholder={isLoadingStates ? "Carregando..." : "Selecione o Estado"} />
                    </SelectTrigger>
                    <SelectContent>
                        {states.map((state) => (
                        <SelectItem key={state.slug} value={state.slug}>
                            {state.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                 {/* City Selector */}
                 <div className="space-y-1">
                     <label htmlFor="city-select" className="text-sm font-medium text-foreground/80">Cidade</label>
                     <Select
                         value={selectedCitySlug}
                         onValueChange={handleCityChange}
                         disabled={!selectedStateSlug || isLoadingCities || cities.length === 0} // Disable if no state, loading cities, or no cities
                     >
                         <SelectTrigger id="city-select" aria-label="Selecionar Cidade">
                         <SelectValue placeholder={
                             !selectedStateSlug ? "Selecione um estado primeiro" :
                             isLoadingCities ? "Carregando cidades..." :
                             cities.length === 0 && selectedStateSlug ? "Nenhuma cidade encontrada" : // Check selectedStateSlug here
                             "Selecione a Cidade"
                             } />
                         </SelectTrigger>
                         <SelectContent>
                         {cities.map((city) => (
                             <SelectItem key={city.slug} value={city.slug}>
                             {city.name}
                             </SelectItem>
                         ))}
                         </SelectContent>
                     </Select>
                      {isLoadingCities && (
                          <p className="text-xs text-muted-foreground flex items-center pt-1">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Buscando cidades...
                          </p>
                      )}
                 </div>
             </div>
         )}


        <Button
            onClick={() => handleFetchTides()}
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
               <Waves className="text-primary"/> Tábua de Marés para {getSelectedCityName(selectedCitySlug)}, {getSelectedStateName(selectedStateSlug)} (Hoje)
            </h2>
            <Table className="rounded-md border">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Hora</TableHead>
                  <TableHead className="text-right">Altura (Metros)</TableHead>
                  {/* Optional: Add Type (High/Low) if available */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tideData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.time}</TableCell>
                    <TableCell className="text-right">{data.height}m</TableCell>
                     {/* Optional: Add Type cell */}
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
                    Não foram encontrados dados de maré para {getSelectedCityName(selectedCitySlug)}, {getSelectedStateName(selectedStateSlug)}. Isso pode ocorrer se a cidade não for costeira ou se não houver dados disponíveis no serviço de origem.
                 </AlertDescription>
             </Alert>
         )}
          {showReadyToFetchPrompt && (
             <div className="mt-6 text-center text-muted-foreground py-4 px-2 border border-dashed rounded-lg">
                 Clique no botão <span className="font-medium">"Ver Tábua de Marés"</span> para carregar os dados para <span className="font-medium">{getSelectedCityName(selectedCitySlug)}, {getSelectedStateName(selectedStateSlug)}</span>.
             </div>
         )}
         {showInitialPrompt && states.length > 0 && !isLoadingStates && !error && ( // Show only if states loaded and no error/loading
             <div className="mt-6 text-center text-muted-foreground py-4 px-2 border border-dashed rounded-lg">
                 Selecione um estado e uma cidade acima para buscar a tábua de marés.
             </div>
         )}
         {/* Handles the case where state fetching failed initially */}
         {states.length === 0 && !isLoadingStates && error && (
             <Alert variant="destructive" className="mt-6 rounded-lg">
                 <ServerCrash className="h-4 w-4"/>
                 <AlertTitle>Falha ao Carregar Dados Iniciais</AlertTitle>
                 <AlertDescription>
                    Não foi possível carregar a lista de estados necessária para continuar. Por favor, recarregue a página ou tente novamente mais tarde. {error}
                 </AlertDescription>
             </Alert>
         )}
      </CardContent>
    </Card>
  );
}

    