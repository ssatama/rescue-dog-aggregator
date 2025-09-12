const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function saveBreedAlert(alertData) {
  try {
    const response = await fetch(`${API_URL}/api/breed-alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        breed: alertData.breed,
        filters: alertData.filters,
        email: alertData.email, // Will be added when user auth is implemented
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save breed alert: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error saving breed alert:", error);
    throw error;
  }
}

const BREED_ALERTS_KEY = "rescue-dog-breed-alerts";

export function saveBreedAlertLocally(alertData) {
  try {
    const existingAlerts = getLocalBreedAlerts();
    const newAlert = {
      id: Date.now().toString(),
      breed: alertData.breed,
      filters: alertData.filters,
      created_at: new Date().toISOString(),
    };

    // Check if alert already exists for this breed
    const existingIndex = existingAlerts.findIndex(
      (alert) => alert.breed === alertData.breed,
    );

    if (existingIndex >= 0) {
      // Update existing alert
      existingAlerts[existingIndex] = newAlert;
    } else {
      // Add new alert
      existingAlerts.push(newAlert);
    }

    localStorage.setItem(BREED_ALERTS_KEY, JSON.stringify(existingAlerts));
    return newAlert;
  } catch (error) {
    console.error("Error saving breed alert locally:", error);
    throw error;
  }
}

export function getLocalBreedAlerts() {
  try {
    const alerts = localStorage.getItem(BREED_ALERTS_KEY);
    return alerts ? JSON.parse(alerts) : [];
  } catch (error) {
    console.error("Error getting local breed alerts:", error);
    return [];
  }
}

export function hasBreedAlert(breed) {
  const alerts = getLocalBreedAlerts();
  return alerts.some((alert) => alert.breed === breed);
}

export async function saveBreedAlertWithFallback(alertData) {
  try {
    // Try API first (when implemented)
    // return await saveBreedAlert(alertData);

    // For now, use local storage
    return saveBreedAlertLocally(alertData);
  } catch (error) {
    // Fallback to local storage if API fails
    console.warn("API save failed, falling back to local storage:", error);
    return saveBreedAlertLocally(alertData);
  }
}
