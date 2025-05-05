import TideFinder from '@/components/tide-finder';

export default function Home() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4 md:p-24">
      <h1 className="mb-8 text-4xl font-bold text-primary">Tábua de Marés</h1>
      <TideFinder />
    </main>
  );
}
