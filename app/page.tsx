import GameBoard from "./components/GameBoard";

export default function Home() {
  return (
    <main className="h-full w-full p-1 sm:p-8 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900 via-green-900 to-teal-950">
      <GameBoard />
    </main>
  );
}
