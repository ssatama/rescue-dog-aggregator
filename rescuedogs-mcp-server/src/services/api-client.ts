import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "../constants.js";
import type {
  Dog,
  EnhancedDogData,
  Organization,
  BreedStats,
  Statistics,
  FilterCountsResponse,
  ApiError,
} from "../types.js";

const REQUEST_TIMEOUT = 10000; // 10 seconds

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "rescuedogs-mcp-server/1.0.0",
      },
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;

      if (axiosError.response) {
        const { status, data } = axiosError.response;

        if (status === 404) {
          return new Error(
            `Not found: ${data?.detail || "The requested resource was not found"}`
          );
        }

        if (status === 422) {
          return new Error(
            `Invalid request: ${data?.detail || "Validation error"}`
          );
        }

        if (status === 429) {
          return new Error(
            "Rate limited: Too many requests. Please try again in a moment."
          );
        }

        if (status >= 500) {
          return new Error(
            "Server error: The rescue dogs API is temporarily unavailable. Please try again later."
          );
        }

        return new Error(
          data?.detail || `API error (${status}): ${axiosError.message}`
        );
      }

      if (axiosError.code === "ECONNABORTED") {
        return new Error(
          "Request timeout: The API took too long to respond. Please try again."
        );
      }

      if (axiosError.code === "ENOTFOUND" || axiosError.code === "ECONNREFUSED") {
        return new Error(
          "Connection error: Unable to reach the rescue dogs API. Please check your internet connection."
        );
      }

      return new Error(`Network error: ${axiosError.message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error("An unexpected error occurred");
  }

  async searchDogs(params: {
    search?: string;
    breed?: string;
    breed_group?: string;
    standardized_size?: string;
    age_category?: string;
    sex?: string;
    energy_level?: string;
    home_type?: string;
    experience_level?: string;
    available_to_country?: string;
    organization_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<Dog[]> {
    // CRITICAL: Always filter for active, available dogs
    const queryParams = new URLSearchParams();
    queryParams.set("status", "available");
    queryParams.set("availability_confidence", "high,medium");

    if (params.search) queryParams.set("search", params.search);
    if (params.breed) queryParams.set("breed", params.breed);
    if (params.breed_group) queryParams.set("breed_group", params.breed_group);
    if (params.standardized_size)
      queryParams.set("standardized_size", params.standardized_size);
    if (params.age_category) queryParams.set("age_category", params.age_category);
    if (params.sex) queryParams.set("sex", params.sex);
    if (params.energy_level) queryParams.set("energy_level", params.energy_level);
    if (params.home_type) queryParams.set("home_type", params.home_type);
    if (params.experience_level)
      queryParams.set("experience_level", params.experience_level);
    if (params.available_to_country)
      queryParams.set("available_to_country", params.available_to_country);
    if (params.organization_id)
      queryParams.set("organization_id", params.organization_id.toString());
    if (params.limit) queryParams.set("limit", params.limit.toString());
    if (params.offset) queryParams.set("offset", params.offset.toString());

    return this.request<Dog[]>({
      method: "GET",
      url: `/api/animals?${queryParams.toString()}`,
    });
  }

  async getDogBySlug(slug: string): Promise<Dog> {
    return this.request<Dog>({
      method: "GET",
      url: `/api/animals/${encodeURIComponent(slug)}`,
    });
  }

  async getEnhancedDogData(animalId: number): Promise<EnhancedDogData> {
    return this.request<EnhancedDogData>({
      method: "GET",
      url: `/api/enhanced_animals/${animalId}/enhanced`,
    });
  }

  async getBulkEnhancedData(animalIds: number[]): Promise<EnhancedDogData[]> {
    return this.request<EnhancedDogData[]>({
      method: "POST",
      url: "/api/enhanced_animals/enhanced/bulk",
      data: { animal_ids: animalIds },
    });
  }

  async getBreedStats(): Promise<BreedStats> {
    return this.request<BreedStats>({
      method: "GET",
      url: "/api/animals/breeds/stats",
    });
  }

  async getBreeds(breedGroup?: string): Promise<string[]> {
    const queryParams = new URLSearchParams();
    if (breedGroup) queryParams.set("breed_group", breedGroup);

    const url = breedGroup
      ? `/api/animals/meta/breeds?${queryParams.toString()}`
      : "/api/animals/meta/breeds";

    return this.request<string[]>({
      method: "GET",
      url,
    });
  }

  async getStatistics(): Promise<Statistics> {
    return this.request<Statistics>({
      method: "GET",
      url: "/api/animals/statistics",
    });
  }

  async getFilterCounts(params?: {
    search?: string;
    breed?: string;
    standardized_size?: string;
    age_category?: string;
    sex?: string;
    available_to_country?: string;
  }): Promise<FilterCountsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.set("status", "available");

    if (params?.search) queryParams.set("search", params.search);
    if (params?.breed) queryParams.set("breed", params.breed);
    if (params?.standardized_size)
      queryParams.set("standardized_size", params.standardized_size);
    if (params?.age_category) queryParams.set("age_category", params.age_category);
    if (params?.sex) queryParams.set("sex", params.sex);
    if (params?.available_to_country)
      queryParams.set("available_to_country", params.available_to_country);

    return this.request<FilterCountsResponse>({
      method: "GET",
      url: `/api/animals/meta/filter_counts?${queryParams.toString()}`,
    });
  }

  async getOrganizations(params?: {
    country?: string;
    active_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Organization[]> {
    const queryParams = new URLSearchParams();

    if (params?.country) queryParams.set("country", params.country);
    if (params?.active_only !== undefined)
      queryParams.set("active_only", params.active_only.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url =
      queryParams.toString().length > 0
        ? `/api/organizations?${queryParams.toString()}`
        : "/api/organizations";

    return this.request<Organization[]>({
      method: "GET",
      url,
    });
  }

  async getEnhancedOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>({
      method: "GET",
      url: "/api/organizations/enhanced",
    });
  }
}

export const apiClient = new ApiClient();
