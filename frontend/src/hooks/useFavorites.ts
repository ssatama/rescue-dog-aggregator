"use client";

// This hook now just re-exports from the FavoritesContext
// This maintains backward compatibility while using global state
export { useFavorites } from "../contexts/FavoritesContext";
