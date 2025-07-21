const si = require('systeminformation');
const { WinccoaManager } = require('winccoa-manager');
const winccoa = new WinccoaManager();

// Zeitintervall zwischen Messungen (5 Sekunden)
const INTERVAL_SECONDS = 5;
const SECONDS_PER_HOUR = 3600; // 1 Stunde = 3600 Sekunden
const HOURS_PER_DAY = 24;      // 24 Stunden pro Tag
const DAYS_PER_WEEK = 7;       // 7 Tage pro Woche

// Objekt zur Speicherung der täglichen Werte pro System und gesamt
let dailyEnergySummary = {
  Lighting: { totalDailyEnergy: 0, totalDailyCost: 0 },
  HVAC: { totalDailyEnergy: 0, totalDailyCost: 0 },
  Appliance: { totalDailyEnergy: 0, totalDailyCost: 0 },
  Total: { totalDailyEnergy: 0, totalDailyCost: 0 },
  lastResetDate: new Date().toDateString() // Initialwert, wird überschrieben
};

// Objekt zur Speicherung der wöchentlichen Werte
let weeklyEnergySummary = {
  totalWeeklyEnergy: 0,
  totalWeeklyCost: 0,
  dailyEnergies: Array(7).fill(0), // [Montag, Dienstag, ..., Sonntag]
  dailyCosts: Array(7).fill(0),    // [Montag, Dienstag, ..., Sonntag]
  lastResetWeek: getWeekNumber(new Date()) // Initialwert, wird überschrieben
};

// Funktion zur Berechnung der Wochennummer (ISO-Woche)
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Funktion zur Simulation von Energieverbrauchsdaten (pro Stunde)
function simulateEnergyConsumption() {
  const hour = new Date().getHours(); // Tageszeit für realistische Schwankungen
  const baseData = {
    Lighting: { 
      voltage: 230 + (Math.random() * 20 - 10), // Spannung: 220–240 V
      current: 1.0 + Math.random() * 2.0 + (hour > 18 || hour < 6 ? 1.5 : 0), // Strom: 1–3 A, abends höher
      energyHourly: 0, 
      power: 0, 
      costHourly: 0 
    },
    HVAC: { 
      voltage: 230 + (Math.random() * 20 - 10), // Spannung: 220–240 V
      current: 5.0 + Math.random() * 5.0 + (hour > 12 && hour < 18 ? 3.0 : 0), // Strom: 5–10 A, nachmittags höher
      energyHourly: 0, 
      power: 0, 
      costHourly: 0 
    },
    Appliance: { 
      voltage: 230 + (Math.random() * 20 - 10), // Spannung: 220–240 V
      current: 2.0 + Math.random() * 4.0 + (hour > 8 && hour < 20 ? 2.0 : 0), // Strom: 2–6 A, tagsüber höher
      energyHourly: 0, 
      power: 0, 
      costHourly: 0 
    }
  };

  for (let system in baseData) {
    baseData[system].power = baseData[system].voltage * baseData[system].current; // Leistung in Watt
    baseData[system].energyHourly = (baseData[system].power * 1) / 1000; // Energie in kWh pro Stunde
  }

  return baseData;
}

// Systeminformationen abrufen
async function getSystemInfo() {
  const cpu = await si.cpu();
  const os = await si.osInfo();
  return {
    cpu: `${cpu.manufacturer} ${cpu.brand}`,
    os: `${os.distro} ${os.release}`
  };
}

// Simulierter Tagespreis basierend auf stündlichem Energieverbrauch
function getEnergyPrice(totalEnergyHourly) {
  const basePrice = 0.30; // Basispreis in €/kWh
  const hour = new Date().getHours(); // Tageszeit (0-23)
  
  const timeVariation = Math.sin(hour * Math.PI / 12) * 0.05; // ±0,05 €/kWh
  const energyVariation = Math.min(0.10, totalEnergyHourly * 0.2); // Max. ±0,10 €/kWh
  const simulatedPrice = Math.max(0.20, Math.min(0.50, basePrice + timeVariation + energyVariation));
  
  console.log(`Simulierter Tagespreis (Stunde ${hour}, ${totalEnergyHourly.toFixed(3)} kWh/h): ${simulatedPrice.toFixed(3)} €/kWh`);
  return simulatedPrice;
}

// Datenpunkte erstellen
async function createDataPoints() {
  const dataPoints = [
    { name: "Lighting", type: "EnergySystem" },
    { name: "HVAC", type: "EnergySystem" },
    { name: "Appliance", type: "EnergySystem" },
    { name: "EnergySummary", type: "EnergySummary" },
    { name: "Comparison", type: "ComparisonValues" },
    { name: "SystemInfo", type: "Systeminfo" },
    { name: "DailyEnergyLighting", type: "DailyEnergy" },
    { name: "DailyEnergyHVAC", type: "DailyEnergy" },
    { name: "DailyEnergyAppliance", type: "DailyEnergy" },
    { name: "DailyEnergyTotal", type: "DailyEnergy" },
    { name: "WeeklyEnergyTotal", type: "DailyEnergy" },
    { name: "ResetTimes", type: "ResetTimes" },
    { name: "WeeklyEnergy", type: "WeeklyEnergyDays" },
    { name: "WeeklyCosts", type: "WeeklyEnergyDays" }
  ];

  for (const dp of dataPoints) {
    if (!winccoa.dpExists(dp.name)) {
      try {
        await winccoa.dpCreate(dp.name, dp.type);
        console.log(`Datenpunkt ${dp.name} vom Typ ${dp.type} erstellt`);
      } catch (err) {
        console.error(`Fehler beim Erstellen von ${dp.name}:`, err);
      }
    }
  }
}

// Funktion zum Laden der gespeicherten Werte aus WinCC OA
async function loadInitialValues() {
  const dps = [
    "DailyEnergyLighting.Energy",
    "DailyEnergyLighting.Cost",
    "DailyEnergyHVAC.Energy",
    "DailyEnergyHVAC.Cost",
    "DailyEnergyAppliance.Energy",
    "DailyEnergyAppliance.Cost",
    "DailyEnergyTotal.Energy",
    "DailyEnergyTotal.Cost",
    "WeeklyEnergyTotal.Energy",
    "WeeklyEnergyTotal.Cost",
    "ResetTimes.LastResetDate",
    "ResetTimes.LastResetWeek",
    "WeeklyEnergy.Day1", // Montag
    "WeeklyEnergy.Day2", // Dienstag
    "WeeklyEnergy.Day3", // Mittwoch
    "WeeklyEnergy.Day4", // Donnerstag
    "WeeklyEnergy.Day5", // Freitag
    "WeeklyEnergy.Day6", // Samstag
    "WeeklyEnergy.Day7", // Sonntag
    "WeeklyCosts.Day1",  // Montag
    "WeeklyCosts.Day2",  // Dienstag
    "WeeklyCosts.Day3",  // Mittwoch
    "WeeklyCosts.Day4",  // Donnerstag
    "WeeklyCosts.Day5",  // Freitag
    "WeeklyCosts.Day6",  // Samstag
    "WeeklyCosts.Day7"   // Sonntag
  ];

  try {
    const values = await winccoa.dpGet(dps);
    dailyEnergySummary.Lighting.totalDailyEnergy = values[0] || 0;
    dailyEnergySummary.Lighting.totalDailyCost = values[1] || 0;
    dailyEnergySummary.HVAC.totalDailyEnergy = values[2] || 0;
    dailyEnergySummary.HVAC.totalDailyCost = values[3] || 0;
    dailyEnergySummary.Appliance.totalDailyEnergy = values[4] || 0;
    dailyEnergySummary.Appliance.totalDailyCost = values[5] || 0;
    dailyEnergySummary.Total.totalDailyEnergy = values[6] || 0;
    dailyEnergySummary.Total.totalDailyCost = values[7] || 0;
    weeklyEnergySummary.totalWeeklyEnergy = values[8] || 0;
    weeklyEnergySummary.totalWeeklyCost = values[9] || 0;
    dailyEnergySummary.lastResetDate = values[10] || new Date().toDateString();
    weeklyEnergySummary.lastResetWeek = values[11] || getWeekNumber(new Date());
    weeklyEnergySummary.dailyEnergies = [
      values[12] || 0, // Montag
      values[13] || 0, // Dienstag
      values[14] || 0, // Mittwoch
      values[15] || 0, // Donnerstag
      values[16] || 0, // Freitag
      values[17] || 0, // Samstag
      values[18] || 0  // Sonntag
    ];
    weeklyEnergySummary.dailyCosts = [
      values[19] || 0, // Montag
      values[20] || 0, // Dienstag
      values[21] || 0, // Mittwoch
      values[22] || 0, // Donnerstag
      values[23] || 0, // Freitag
      values[24] || 0, // Samstag
      values[25] || 0  // Sonntag
    ];

    console.log('Initialwerte aus WinCC OA geladen:', { dailyEnergySummary, weeklyEnergySummary });
  } catch (err) {
    console.error('Fehler beim Laden der Initialwerte:', err);
  }
}

// Hauptdaten generieren und in Datenpunkte schreiben
async function generateEnergyData() {
  const energyData = simulateEnergyConsumption();

  // Stündlicher Gesamtverbrauch
  const totalEnergyHourly = energyData.Lighting.energyHourly + energyData.HVAC.energyHourly + energyData.Appliance.energyHourly;
  const price = getEnergyPrice(totalEnergyHourly);

  // Kosten pro Stunde berechnen
  for (let system in energyData) {
    energyData[system].costHourly = energyData[system].energyHourly * price;
  }
  const totalCostHourly = totalEnergyHourly * price;

  // Täglichen Verbrauch und Kosten akkumulieren
  const currentDate = new Date().toDateString();
  const currentWeek = getWeekNumber(new Date());
  const currentDayOfWeek = new Date().getDay();
  const weekDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  // Wöchentlicher Reset (unabhängig vom Tageswechsel prüfen)
  if (weeklyEnergySummary.lastResetWeek !== currentWeek) {
    weeklyEnergySummary.dailyEnergies = Array(7).fill(0);
    weeklyEnergySummary.dailyCosts = Array(7).fill(0);
    weeklyEnergySummary.totalWeeklyEnergy = 0; // Explizit zurücksetzen
    weeklyEnergySummary.totalWeeklyCost = 0;   // Explizit zurücksetzen
    weeklyEnergySummary.lastResetWeek = currentWeek;

    // Reset-Werte sofort speichern
    const dpReset = ["ResetTimes.LastResetWeek"];
    const valReset = [currentWeek];
    const dpEnergyDays = Array.from({ length: 7 }, (_, i) => `WeeklyEnergy.Day${i + 1}`);
    const dpCostDays = Array.from({ length: 7 }, (_, i) => `WeeklyCosts.Day${i + 1}`);
    await winccoa.dpSet(
      [...dpReset, ...dpEnergyDays, ...dpCostDays, "WeeklyEnergyTotal.Energy", "WeeklyEnergyTotal.Cost"],
      [...valReset, ...weeklyEnergySummary.dailyEnergies, ...weeklyEnergySummary.dailyCosts, 0, 0]
    );
  }

  // Täglicher Reset
  if (dailyEnergySummary.lastResetDate !== currentDate) {
    const previousDayEnergy = dailyEnergySummary.Total.totalDailyEnergy;
    const previousDayCost = dailyEnergySummary.Total.totalDailyCost;
    const previousDate = new Date(new Date().setDate(new Date().getDate() - 1));
    const previousDayOfWeek = previousDate.getDay();
    const previousWeekDayIndex = previousDayOfWeek === 0 ? 6 : previousDayOfWeek - 1;

    // Tägliche Werte zurücksetzen
    dailyEnergySummary = {
      Lighting: { totalDailyEnergy: 0, totalDailyCost: 0 },
      HVAC: { totalDailyEnergy: 0, totalDailyCost: 0 },
      Appliance: { totalDailyEnergy: 0, totalDailyCost: 0 },
      Total: { totalDailyEnergy: 0, totalDailyCost: 0 },
      lastResetDate: currentDate
    };

    // Werte des vorherigen Tages an der richtigen Wochentag-Position speichern
    if (previousDayEnergy > 0) {
      weeklyEnergySummary.dailyEnergies[previousWeekDayIndex] = previousDayEnergy;
      weeklyEnergySummary.dailyCosts[previousWeekDayIndex] = previousDayCost;
    }

    // Reset-Zeiten und wochentagspezifische Werte speichern
    const dpReset = ["ResetTimes.LastResetDate"];
    const valReset = [currentDate];
    const dpEnergyDays = Array.from({ length: 7 }, (_, i) => `WeeklyEnergy.Day${i + 1}`);
    const dpCostDays = Array.from({ length: 7 }, (_, i) => `WeeklyCosts.Day${i + 1}`);
    await winccoa.dpSet(
      [...dpReset, ...dpEnergyDays, ...dpCostDays],
      [...valReset, ...weeklyEnergySummary.dailyEnergies, ...weeklyEnergySummary.dailyCosts]
    );
  }

  // Akkumulierte Werte für 5-Sekunden-Intervall
  const intervalFraction = INTERVAL_SECONDS / SECONDS_PER_HOUR;
  for (let system in energyData) {
    const energyInterval = energyData[system].energyHourly * intervalFraction;
    dailyEnergySummary[system].totalDailyEnergy += energyInterval;
    dailyEnergySummary[system].totalDailyCost += energyInterval * price;
  }
  const dailyEnergyIncrement = totalEnergyHourly * intervalFraction;
  dailyEnergySummary.Total.totalDailyEnergy += dailyEnergyIncrement;
  dailyEnergySummary.Total.totalDailyCost += dailyEnergyIncrement * price;

  // Wöchentliche Summe aktualisieren (inklusive aktuellem Tag)
  weeklyEnergySummary.dailyEnergies[weekDayIndex] = dailyEnergySummary.Total.totalDailyEnergy;
  weeklyEnergySummary.dailyCosts[weekDayIndex] = dailyEnergySummary.Total.totalDailyCost;
  weeklyEnergySummary.totalWeeklyEnergy = weeklyEnergySummary.dailyEnergies.reduce((sum, val) => sum + val, 0);
  weeklyEnergySummary.totalWeeklyCost = weeklyEnergySummary.dailyCosts.reduce((sum, val) => sum + val, 0);

  const systemInfo = await getSystemInfo();

  // Vergleichswerte (basierend auf stündlichen Werten)
  const diffLH = ((energyData.Lighting.energyHourly - energyData.HVAC.energyHourly) / energyData.HVAC.energyHourly) * 100;
  const diffLA = ((energyData.Lighting.energyHourly - energyData.Appliance.energyHourly) / energyData.Appliance.energyHourly) * 100;
  const diffHA = ((energyData.HVAC.energyHourly - energyData.Appliance.energyHourly) / energyData.Appliance.energyHourly) * 100;
  const diffHL = ((energyData.HVAC.energyHourly - energyData.Lighting.energyHourly) / energyData.Lighting.energyHourly) * 100;
  const diffAL = ((energyData.Appliance.energyHourly - energyData.Lighting.energyHourly) / energyData.Lighting.energyHourly) * 100;
  const diffAH = ((energyData.Appliance.energyHourly - energyData.HVAC.energyHourly) / energyData.HVAC.energyHourly) * 100;

  // Datenpunkte setzen
  const dps = [
    "Lighting.Voltage",
    "Lighting.Current",
    "Lighting.Power",
    "Lighting.Energy",
    "Lighting.Cost",
    "HVAC.Voltage",
    "HVAC.Current",
    "HVAC.Power",
    "HVAC.Energy",
    "HVAC.Cost",
    "Appliance.Voltage",
    "Appliance.Current",
    "Appliance.Power",
    "Appliance.Energy",
    "Appliance.Cost",
    "EnergySummary.TotalEnergy",
    "EnergySummary.TotalCost",
    "EnergySummary.EnergyPrice",
    "DailyEnergyLighting.Energy",
    "DailyEnergyLighting.Cost",
    "DailyEnergyHVAC.Energy",
    "DailyEnergyHVAC.Cost",
    "DailyEnergyAppliance.Energy",
    "DailyEnergyAppliance.Cost",
    "DailyEnergyTotal.Energy",
    "DailyEnergyTotal.Cost",
    "WeeklyEnergyTotal.Energy",
    "WeeklyEnergyTotal.Cost",
    "Comparison.Lighting_HVAC",
    "Comparison.Lighting_Appliance",
    "Comparison.HVAC_Appliance",
    "Comparison.HVAC_Lighting",
    "Comparison.Appliance_Lighting",
    "Comparison.Appliance_HVAC",
    "SystemInfo.CPU",
    "SystemInfo.OS"
  ];

  const values = [
    energyData.Lighting.voltage,
    energyData.Lighting.current,
    energyData.Lighting.power,
    energyData.Lighting.energyHourly,
    energyData.Lighting.costHourly,
    energyData.HVAC.voltage,
    energyData.HVAC.current,
    energyData.HVAC.power,
    energyData.HVAC.energyHourly,
    energyData.HVAC.costHourly,
    energyData.Appliance.voltage,
    energyData.Appliance.current,
    energyData.Appliance.power,
    energyData.Appliance.energyHourly,
    energyData.Appliance.costHourly,
    totalEnergyHourly,
    totalCostHourly,
    price,
    dailyEnergySummary.Lighting.totalDailyEnergy,
    dailyEnergySummary.Lighting.totalDailyCost,
    dailyEnergySummary.HVAC.totalDailyEnergy,
    dailyEnergySummary.HVAC.totalDailyCost,
    dailyEnergySummary.Appliance.totalDailyEnergy,
    dailyEnergySummary.Appliance.totalDailyCost,
    dailyEnergySummary.Total.totalDailyEnergy,
    dailyEnergySummary.Total.totalDailyCost,
    weeklyEnergySummary.totalWeeklyEnergy,
    weeklyEnergySummary.totalWeeklyCost,
    diffLH,
    diffLA,
    diffHA,
    diffHL,
    diffAL,
    diffAH,
    systemInfo.cpu,
    systemInfo.os
  ];

  await winccoa.dpSet(dps, values);

  console.log('Daten in WinCC OA geschrieben:', { 
    energyData, 
    totalEnergyHourly, 
    totalCostHourly, 
    price, 
    dailyEnergySummary, 
    weeklyEnergySummary, 
    comparison: { diffLH, diffLA, diffHA, diffHL, diffAL, diffAH } 
  });
}

// Simulation starten
async function startSimulation() {
  await createDataPoints();
  console.log('Datenpunkte überprüft und erstellt.');

  await loadInitialValues(); // Initialwerte laden
  await generateEnergyData().catch(err => console.error('Fehler:', err));
  setInterval(() => {
    generateEnergyData().catch(err => console.error('Fehler:', err));
  }, INTERVAL_SECONDS * 1000); // 5 Sekunden
}

// Start
startSimulation();