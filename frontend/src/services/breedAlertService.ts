import { getApiUrl } from "../utils/apiConfig";
import { logger, reportError } from "../utils/logger";

const API_URL = getApiUrl();

interface BreedAlertData {
  breed: string;
  filters?: Record<string, unknown>;
  email?: string;
}

interface BreedAlert {
  id: string;
  breed: string;
  filters?: Record<string, unknown>;
  created_at: string;
}

export async function saveBreedAlert(
  alertData: BreedAlertData,
): Promise<unknown> {
  try {
    const response = await fetch(`${API_URL}/api/breed-alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        breed: alertData.breed,
        filters: alertData.filters,
        email: alertData.email,
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save breed alert: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    reportError(error, { context: "breedAlertService.saveBreedAlert" });
    throw error;
  }
}

const BREED_ALERTS_KEY = "rescue-dog-breed-alerts";

export function saveBreedAlertLocally(alertData: BreedAlertData): BreedAlert {
  try {
    const existingAlerts = getLocalBreedAlerts();
    const newAlert: BreedAlert = {
      id: Date.now().toString(),
      breed: alertData.breed,
      filters: alertData.filters,
      created_at: new Date().toISOString(),
    };

    const existingIndex = existingAlerts.findIndex(
      (alert) => alert.breed === alertData.breed,
    );

    const updatedAlerts =
      existingIndex >= 0
        ? existingAlerts.map((alert, i) => (i === existingIndex ? newAlert : alert))
        : [...existingAlerts, newAlert];

    localStorage.setItem(BREED_ALERTS_KEY, JSON.stringify(updatedAlerts));
    return newAlert;
  } catch (error) {
    reportError(error, { context: "breedAlertService.saveLocally" });
    throw error;
  }
}

export function getLocalBreedAlerts(): BreedAlert[] {
  try {
    const alerts = localStorage.getItem(BREED_ALERTS_KEY);
    return alerts ? JSON.parse(alerts) : [];
  } catch (error) {
    reportError(error, { context: "breedAlertService.getLocalAlerts" });
    return [];
  }
}

export function hasBreedAlert(breed: string): boolean {
  const alerts = getLocalBreedAlerts();
  return alerts.some((alert) => alert.breed === breed);
}

export async function saveBreedAlertWithFallback(
  alertData: BreedAlertData,
): Promise<BreedAlert> {
  try {
    await saveBreedAlert(alertData);
  } catch (error) {
    logger.warn("API save failed, falling back to local storage only:", error);
  }
  return saveBreedAlertLocally(alertData);
}
