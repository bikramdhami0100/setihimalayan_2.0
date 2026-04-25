import React from "react";
import { useSearchData } from "../../../context/SearchContext";
import BusList from "../../../components/BusList";

export default function AllBuses() {
  const { results, isLoading } = useSearchData();
  return <BusList buses={results} isLoading={isLoading} />;
}
