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

// Example list of states and cities (replace with a more comprehensive list or API call if needed)
const locations: { [key: string]: string[] } = {
  "Pará": ["Ananindeua", "Belém", "Salinópolis"],
  "Maranhão": ["São Luís", "Alcântara"],
  "Ceará": ["Fortaleza", "Jericoacoara"],
  "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "Arraial do Cabo"],
  "São Paulo": ["Santos", "Ubatuba"],
};

const states = Object.keys(locations);

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

    if (savedState && locations[savedState]) {
      setSelectedState(savedState);
      setCities(locations[savedState]);
      if (savedCity && locations[savedState].includes(savedCity)) {
        setSelectedCity(savedCity);
      }
    } else if (states.length > 0) {
        // Default to first state if nothing saved
        const defaultState = states[0];
        setSelectedState(defaultState);
        setCities(locations[defaultState] || []);
    }
  }, []);

  // Update cities when state changes and save to localStorage
  const handleStateChange = (value: string) => {
    setSelectedState(value);
    const newCities = locations[value] || [];
    setCities(newCities);
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
  const handleFetchTides = () => {
    if (!selectedState || !selectedCity) {
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
        const data = await fetchTideDataAction(selectedState, selectedCity);
        if (!data || data.length === 0) {
          setError("Não foi possível obter os dados da maré para esta localização. O serviço pode estar indisponível ou a cidade não é suportada.");
           toast({
            title: "Erro ao buscar dados",
            description: "Não foi possível obter os dados da maré.",
            variant: "destructive",
          });
        } else {
          setTideData(data);
           toast({
            title: "Dados da maré carregados!",
            description: `Tábua de marés para ${selectedCity}, ${selectedState}.`,
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
          Escolha o estado e a cidade para ver a tábua de marés.
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
                <SelectValue placeholder="Selecione a Cidade" />
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
            onClick={handleFetchTides}
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
               <Waves className="text-primary"/> Tábua de Marés para {selectedCity}, {selectedState}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead className="text-right">Altura</TableHead>
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
         {tideData === null && !isPending && !error && selectedCity && (
             <div className="mt-8 text-center text-muted-foreground">
                 Clique no botão acima para carregar os dados da maré.
             </div>
         )}
      </CardContent>
    </Card>
  );
}
