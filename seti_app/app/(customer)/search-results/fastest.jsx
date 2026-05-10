import React from "react";
import { useSearchData } from "../../../context/SearchContext";
import BusList from "../../../components/BusList";
import dayjs from "dayjs";

export default function FastestBuses() {
  const { results, isLoading } = useSearchData();

  const sortedResults = [...results].sort((a, b) => {
    const durA = dayjs(a.arrival_time).diff(dayjs(a.departure_time));
    const durB = dayjs(b.arrival_time).diff(dayjs(b.departure_time));
    return durA - durB;
  });

  return <BusList buses={sortedResults} isLoading={isLoading} />;
}
