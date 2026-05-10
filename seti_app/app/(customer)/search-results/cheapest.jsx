import React from "react";
import { useSearchData } from "../../../context/SearchContext";
import BusList from "../../../components/BusList";

export default function CheapestBuses() {
  const { results, isLoading } = useSearchData();

  const sortedResults = [...results].sort((a, b) => a.base_price - b.base_price);

  return <BusList buses={sortedResults} isLoading={isLoading} />;
}
