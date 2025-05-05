"use client";

import type { ChangeEvent } from "react";
import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Waves, AlertTriangle } from "lucide-react";
import type { TideData } from "@/services/tabua-de-mares";
import { fetchTideDataAction } from "@/app/actions"; // Import the server action
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Comprehensive list of Brazilian states and relevant coastal/river cities for tide data
const locations: { [key: string]: string[] } = {
  "Alagoas": ["Maceió", "Maragogi", "Barra de São Miguel"],
  "Amapá": ["Macapá", "Oiapoque", "Santana"],
  "Amazonas": ["Manaus", "Parintins", "Itacoatiara", "Tefé"], // Major river ports
  "Bahia": ["Salvador", "Porto Seguro", "Ilhéus", "Itacaré", "Caravelas", "Valença", "Prado"],
  "Ceará": ["Fortaleza", "Jericoacoara", "Canoa Quebrada", "Camocim", "Icapuí", "Aracati"],
  "Espírito Santo": ["Vitória", "Guarapari", "Vila Velha", "Aracruz", "São Mateus", "Conceição da Barra"],
  "Maranhão": ["São Luís", "Alcântara", "Barreirinhas", "Tutóia", "Raposa"],
  "Pará": ["Belém", "Salinópolis", "Santarém", "Marabá", "Soure", "Vigia", "Bragança", "Mosqueiro"],
  "Paraíba": ["João Pessoa", "Cabedelo", "Pitimbu", "Baía da Traição"],
  "Paraná": ["Paranaguá", "Guaratuba", "Matinhos", "Antonina", "Pontal do Paraná"],
  "Pernambuco": ["Recife", "Olinda", "Porto de Galinhas", "Fernando de Noronha", "Ipojuca", "Cabo de Santo Agostinho", "Tamandaré", "Goiana"],
  "Piauí": ["Parnaíba", "Luís Correia", "Cajueiro da Praia"],
  "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "Arraial do Cabo", "Búzios", "Angra dos Reis", "Paraty", "Macaé", "Cabo Frio", "Mangaratiba", "Sepetiba"],
  "Rio Grande do Norte": ["Natal", "Pipa", "Mossoró", "Galinhos", "São Miguel do Gostoso", "Tibau do Sul"],
  "Rio Grande do Sul": ["Rio Grande", "Tramandaí", "Torres", "Pelotas", "São José do Norte", "Cassino"],
  "Rondônia": ["Porto Velho"], // Major river port
  "Santa Catarina": ["Florianópolis", "Balneário Camboriú", "Itajaí", "São Francisco do Sul", "Imbituba", "Laguna", "Itapoá", "Bombinhas"],
  "São Paulo": ["Santos", "Ubatuba", "Guarujá", "São Sebastião", "Ilhabela", "Cananéia", "Bertioga", "Caraguatatuba", "Iguape"],
  "Sergipe": ["Aracaju", "Estância", "Pirambu"],
  "Tocantins": ["Palmas"], // Capital on Palmas River (Tocantins River tributary)
  // States generally without significant tide locations (coastal/major river):
  // Acre, Distrito Federal, Goiás, Mato Grosso, Mato Grosso do Sul, Minas Gerais, Roraima
};


const states = Object.keys(locations).sort(); // Sort states alphabetically

export default function TideFinder() {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [tideData, setTideData] = useState<TideData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast(); // Initialize toast

  // Load saved location from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("selectedState");
    const savedCity = localStorage.getItem("selectedCity");

    let initialState = "";
    if (savedState && locations[savedState]) {
        initialState = savedState;
    } else if (states.length > 0) {
        // Default to a common coastal state like Rio de Janeiro or São Paulo if no saved state
        initialState = states.includes("Rio de Janeiro") ? "Rio de Janeiro" : states[0];
    }

    if (initialState) {
        setSelectedState(initialState);
        const initialCities = locations[initialState] || [];
        setCities(initialCities);
        if (savedCity && initialCities.includes(savedCity)) {
            setSelectedCity(savedCity);
            // Optionally auto-fetch data if both state and city were saved
            // handleFetchTides(initialState, savedCity); // Be mindful of initial load performance
        } else if (initialCities.length > 0) {
            // Optionally select the first city if only state was saved or city was invalid
            // setSelectedCity(initialCities[0]);
        }
    }

  }, []); // Empty dependency array ensures this runs only once on mount

  // Update cities when state changes and save to localStorage
  const handleStateChange = (value: string) => {
    setSelectedState(value);
    const newCities = locations[value] || [];
    setCities(newCities.sort()); // Sort cities alphabetically
    setSelectedCity(""); // Reset city when state changes
    setTideData(null); // Clear previous results
    setError(null);
    localStorage.setItem("selectedState", value);
    localStorage.removeItem("selectedCity"); // Remove old city on state change
  };

  // Save city to localStorage
  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setTideData(null); // Clear previous results
    setError(null);
    if (value) {
      localStorage.setItem("selectedCity", value);
    } else {
      localStorage.removeItem("selectedCity");
    }
  };

  // Fetch tide data using server action
  const handleFetchTides = (stateToFetch = selectedState, cityToFetch = selectedCity) => {
    if (!stateToFetch || !cityToFetch) {
      setError("Por favor, selecione um estado e uma cidade.");
      toast({ // Add toast notification
        title: "Seleção Incompleta",
        description: "Por favor, selecione um estado e uma cidade.",
        variant: "destructive",
      });
      return;
    }
    setError(null);
    setTideData(null);

    startTransition(async () => {
      try {
        const data = await fetchTideDataAction(stateToFetch, cityToFetch);
        if (!data || data.length === 0) {
          setError("Não foi possível obter os dados da maré para esta localização. O serviço pode estar indisponível, a cidade não é suportada, ou não há dados para hoje.");
           toast({
            title: "Erro ao buscar dados",
            description: "Não foi possível obter os dados da maré. Verifique a seleção ou tente mais tarde.",
            variant: "destructive",
          });
        } else {
          setTideData(data);
           toast({
            title: "Dados da maré carregados!",
            description: `Tábua de marés para ${cityToFetch}, ${stateToFetch}.`,
          });
        }
      } catch (err) {
        console.error("Error fetching tide data:", err);
        setError("Ocorreu um erro ao buscar os dados da maré. Tente novamente mais tarde.");
        toast({ // Add toast notification for fetch error
            title: "Erro de Rede",
            description: "Não foi possível conectar ao serviço de tábua de marés.",
            variant: "destructive",
          });
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <MapPin />
          Selecione a Localização
        </CardTitle>
         <CardDescription>
          Escolha o estado e a cidade para ver a tábua de marés diária. A fonte dos dados é <a href="https://tabuademares.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">tabuademares.com</a>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* State Selector */}
          <div className="space-y-2">
            <label htmlFor="state-select" className="text-sm font-medium">Estado</label>
            <Select
              value={selectedState}
              onValueChange={handleStateChange}
            >
              <SelectTrigger id="state-select">
                <SelectValue placeholder="Selecione o Estado" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Selector */}
          <div className="space-y-2">
            <label htmlFor="city-select" className="text-sm font-medium">Cidade</label>
            <Select
              value={selectedCity}
              onValueChange={handleCityChange}
              disabled={!selectedState || cities.length === 0}
            >
              <SelectTrigger id="city-select">
                <SelectValue placeholder={selectedState && cities.length === 0 ? "Nenhuma cidade relevante encontrada" : "Selecione a Cidade"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
            onClick={() => handleFetchTides()} // Pass state/city explicitly if needed from elsewhere
            disabled={!selectedState || !selectedCity || isPending}
            className="w-full bg-primary hover:bg-primary/90"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Waves className="mr-2 h-4 w-4" />
          )}
          {isPending ? "Buscando..." : "Ver Tábua de Marés"}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-6">
             <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {tideData && tideData.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
               <Waves className="text-primary"/> Tábua de Marés para {selectedCity}, {selectedState} (Hoje)
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead className="text-right">Altura (Metros)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tideData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell>{data.time}</TableCell>
                    <TableCell className="text-right font-medium">{data.height}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
         {tideData === null && !isPending && !error && selectedState && selectedCity && (
             <div className="mt-8 text-center text-muted-foreground">
                 Clique no botão acima para carregar os dados da maré para {selectedCity}, {selectedState}.
             </div>
         )}
         {tideData === null && !isPending && !error && (!selectedState || !selectedCity) && (
             <div className="mt-8 text-center text-muted-foreground">
                 Selecione um estado e uma cidade para buscar a tábua de marés.
             </div>
         )}
      </CardContent>
    </Card>
  );
}
