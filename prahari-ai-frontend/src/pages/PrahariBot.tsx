import GptInterface from "../components/chat/GptInterface";

export default function PrahariBot() {
  return (
    <div className="w-full h-full flex flex-col overflow-y-auto scrollbar-hide">
      <GptInterface />
    </div>
  );
}