import GameBoard from "./components/GameBoard";

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-emerald-900 via-green-900 to-teal-950 flex flex-col items-center justify-center">
      <GameBoard />
    </main>
  );
}
