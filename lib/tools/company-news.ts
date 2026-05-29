import { CompanyNews } from "@/types";

export async function fetchCompanyNews(company: string): Promise<CompanyNews> {
  const res = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: company, num: 5 }),
  });

  if (!res.ok) {
    return { company, articles: [] };
  }

  const data = await res.json();
  const articles = (data.news ?? []).slice(0, 5).map((item: any) => ({
    title: item.title ?? "",
    snippet: item.snippet ?? "",
    date: item.date ?? "",
    source: item.source ?? "",
  }));

  return { company, articles };
}
