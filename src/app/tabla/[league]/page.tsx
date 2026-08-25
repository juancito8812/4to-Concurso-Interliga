import TablaLigaClient from "./TablaLigaClient";

export function generateStaticParams() {
  return [
    { league: "laliga" },
    { league: "premier" },
    { league: "seriea" },
    { league: "bundesliga" },
    { league: "champions" },
    { league: "europa" },
    { league: "conference" },
    { league: "coppaitalia" },
  ];
}

export default function TablaLigaPage() {
  return <TablaLigaClient />;
}
