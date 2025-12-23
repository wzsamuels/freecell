import GameBoard from "./components/GameBoard";

export default function Home() {
  return (
    <main className="min-h-screen w-full p-0 sm:p-8 flex flex-col items-center justify-start overflow-auto bg-gradient-to-br from-emerald-900 via-green-900 to-teal-950">
      <GameBoard />
    </main>
  );
}
