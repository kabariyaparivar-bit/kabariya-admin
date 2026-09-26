import { NextResponse } from "next/server";
import { Country, State, City } from "country-state-city";
import { getDb } from "@/lib/mongodb";

// Fallback Gujarati dictionaries
const GU_COUNTRY_NAMES: Record<string, string> = {
  IN: "ભારત",
  US: "અમેરિકા (USA)",
  GB: "યુનાઇટેડ કિંગડમ (UK)",
  AE: "સંયુક્ત આરબ અમીરાત (UAE)",
  CA: "કેનેડા",
  AU: "ઓસ્ટ્રેલિયા",
  NZ: "ન્યુઝીલેન્ડ",
  KE: "કેન્યા",
  UG: "યુગાન્ડા",
  DE: "જર્મની",
  SG: "સિંગાપોર",
};

const GU_STATE_NAMES: Record<string, string> = {
  GJ: "ગુજરાત",
  MH: "મહારાષ્ટ્ર",
  RJ: "રાજસ્થાન",
  MP: "મધ્યપ્રદેશ",
  DL: "દિલ્હી",
  KA: "કર્ણાટક",
  TN: "તમિલનાડુ",
  TG: "તેલંગાણા",
  WB: "પશ્ચિમ બંગાળ",
  UP: "ઉત્તર પ્રદેશ",
  HR: "હરિયાણા",
  PB: "પંજાબ",
  GA: "ગોવા",
};

const GU_CITY_NAMES: Record<string, string> = {
  Savarkundla: "સાવરકુંડલા",
  Kundla: "કુંડલા (સાવરકુંડલા)",
  Amreli: "અમરેલી",
  Surat: "સુરત",
  Ahmedabad: "અમદાવાદ",
  Rajkot: "રાજકોટ",
  Bhavnagar: "ભાવનગર",
  Vadodara: "વડોદરા",
  Jamnagar: "જામનગર",
  Junagadh: "જૂનાગઢ",
  Gandhinagar: "ગાંધીનગર",
  Morbi: "મોરબી",
  Navsari: "નવસારી",
  Valsad: "વલસાડ",
  Bharuch: "ભરૂચ",
  Anand: "આણંદ",
  Mehsana: "મહેસાણા",
  Surendranagar: "સુરેન્દ્રનગર",
  Botad: "બોટાદ",
  Porbandar: "પોરબંદર",
  Veraval: "વેરાવળ",
  Patan: "પાટણ",
  Dahod: "દાહોદ",
  Palanpur: "પાલનપુર",
  Himatnagar: "હિંમતનગર",
  Vapi: "વાપી",
  Ankleshwar: "અંકલેશ્વર",
  Gandhidham: "ગાંધીધામ",
  Jetpur: "જેતપુર",
  Gondal: "ગોંડલ",
  Mahuva: "મહુવા",
  Gariadhar: "ગારીયાધાર",
  Bagasara: "બગસરા",
  Dhari: "ધારી",
  Rajula: "રાજુલા",
  Jafrabad: "જાફરાબાદ",
  Lathi: "લાઠી",
  Babra: "બાબરા",
  Keshod: "કેશોદ",
  Dhoraji: "ધોરાજી",
  Upleta: "ઉપલેટા",
  Visnagar: "વિસનગર",
  Godhra: "ગોધરા",
  Bhuj: "ભુજ",
  Mandvi: "માંડવી",
  Anjar: "અંજાર",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryParam = searchParams.get("country")?.trim();
    const stateParam = searchParams.get("state")?.trim();

    const db = await getDb();

    // 1. If Country and State are provided -> Return Cities
    if (countryParam && stateParam) {
      let resolvedCountryCode = countryParam.toUpperCase();
      let resolvedStateCode = stateParam.toUpperCase();

      // Robust country code resolution
      if (countryParam.length > 2) {
        const cLower = countryParam.toLowerCase();
        if (cLower === "india" || cLower === "bharat" || cLower === "ભારત") {
          resolvedCountryCode = "IN";
        } else {
          const cMatch = Country.getAllCountries().find(
            (c) => c.name.toLowerCase() === cLower || c.isoCode.toLowerCase() === cLower
          );
          if (cMatch) resolvedCountryCode = cMatch.isoCode;
        }
      }

      // Robust state code resolution (handles Gujarat, Gujrat, GJ, Maharashtra, etc.)
      const sLower = stateParam.toLowerCase().trim();
      if (sLower === "gj" || sLower === "gujarat" || sLower === "gujrat" || sLower.includes("guj")) {
        resolvedStateCode = "GJ";
      } else if (sLower === "mh" || sLower === "maharashtra") {
        resolvedStateCode = "MH";
      } else if (sLower === "rj" || sLower === "rajasthan") {
        resolvedStateCode = "RJ";
      } else {
        const pkgStates = State.getStatesOfCountry(resolvedCountryCode) || [];
        const sMatch = pkgStates.find(
          (s) =>
            s.isoCode.toLowerCase() === sLower ||
            s.name.toLowerCase() === sLower ||
            s.name.toLowerCase().replace(/\s+/g, "") === sLower.replace(/\s+/g, "")
        );
        if (sMatch) {
          resolvedStateCode = sMatch.isoCode;
        } else if (db) {
          try {
            const dbSt = await db.collection("states").findOne({
              countryCode: resolvedCountryCode,
              $or: [
                { isoCode: stateParam.toUpperCase() },
                { name: { $regex: new RegExp("^" + stateParam + "$", "i") } },
              ],
            });
            if (dbSt?.isoCode) resolvedStateCode = dbSt.isoCode;
          } catch {}
        }
      }

      let cities: any[] = [];

      if (db) {
        try {
          cities = await db
            .collection("cities")
            .find({
              countryCode: resolvedCountryCode,
              $or: [
                { stateCode: resolvedStateCode },
                { stateCode: stateParam.toUpperCase() },
              ],
            }, { projection: { _id: 0 } })
            .sort({ name: 1 })
            .toArray();
        } catch (dbErr: any) {
          console.warn("[Admin Locations API] DB city query warning:", dbErr.message);
        }
      }

      if (!cities || cities.length === 0) {
        const pkgCities = City.getCitiesOfState(resolvedCountryCode, resolvedStateCode) || [];
        cities = pkgCities.map((ct) => ({
          name: ct.name,
          nameGu: GU_CITY_NAMES[ct.name] || ct.name,
          countryCode: ct.countryCode,
          stateCode: ct.stateCode,
        }));
      }

      if (resolvedStateCode === "GJ") {
        const priorityCities = ["Savarkundla", "Surat", "Ahmedabad", "Rajkot", "Amreli", "Bhavnagar", "Vadodara", "Jamnagar", "Junagadh"];
        cities.sort((a, b) => {
          const aIdx = priorityCities.indexOf(a.name);
          const bIdx = priorityCities.indexOf(b.name);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      return NextResponse.json({
        success: true,
        country: resolvedCountryCode,
        state: resolvedStateCode,
        count: cities.length,
        data: cities,
      });
    }

    // 2. If only Country is provided -> Return States of that Country
    if (countryParam) {
      let resolvedCountryCode = countryParam.toUpperCase();
      if (countryParam.length > 2) {
        const cLower = countryParam.toLowerCase();
        if (cLower === "india" || cLower === "bharat" || cLower === "ભારત") {
          resolvedCountryCode = "IN";
        } else {
          const cMatch = Country.getAllCountries().find(
            (c) => c.name.toLowerCase() === cLower || c.isoCode.toLowerCase() === cLower
          );
          if (cMatch) resolvedCountryCode = cMatch.isoCode;
        }
      }

      let states: any[] = [];

      if (db) {
        try {
          states = await db
            .collection("states")
            .find({ countryCode: resolvedCountryCode }, { projection: { _id: 0 } })
            .sort({ name: 1 })
            .toArray();
        } catch (dbErr: any) {
          console.warn("[Admin Locations API] DB state query warning:", dbErr.message);
        }
      }

      if (!states || states.length === 0) {
        const pkgStates = State.getStatesOfCountry(resolvedCountryCode) || [];
        states = pkgStates.map((s) => ({
          isoCode: s.isoCode,
          countryCode: s.countryCode,
          name: s.name,
          nameGu: (s.countryCode === "IN" && GU_STATE_NAMES[s.isoCode]) ? GU_STATE_NAMES[s.isoCode] : s.name,
        }));
      }

      // Standardize Gujarat name to proper "Gujarat"
      states = states.map((s) => ({
        ...s,
        name: s.isoCode === "GJ" ? "Gujarat" : s.name,
        nameGu: (s.countryCode === "IN" && GU_STATE_NAMES[s.isoCode]) ? GU_STATE_NAMES[s.isoCode] : (s.nameGu || s.name),
      }));

      if (resolvedCountryCode === "IN") {
        states.sort((a, b) => {
          if (a.isoCode === "GJ" || a.name === "Gujarat") return -1;
          if (b.isoCode === "GJ" || b.name === "Gujarat") return 1;
          if (a.isoCode === "MH" || a.name === "Maharashtra") return -1;
          if (b.isoCode === "MH" || b.name === "Maharashtra") return 1;
          return a.name.localeCompare(b.name);
        });
      }

      return NextResponse.json({
        success: true,
        country: resolvedCountryCode,
        count: states.length,
        data: states,
      });
    }

    // 3. Return Countries List
    let countries: any[] = [];

    if (db) {
      try {
        countries = await db
          .collection("countries")
          .find({}, { projection: { _id: 0 } })
          .sort({ name: 1 })
          .toArray();
      } catch (dbErr: any) {
        console.warn("[Admin Locations API] DB countries query warning:", dbErr.message);
      }
    }

    if (!countries || countries.length === 0) {
      const pkgCountries = Country.getAllCountries();
      countries = pkgCountries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        nameGu: GU_COUNTRY_NAMES[c.isoCode] || c.name,
        phonecode: c.phonecode,
        flag: c.flag,
      }));
    }

    const priorityIso = ["IN", "US", "GB", "AE", "CA", "AU", "NZ", "KE", "UG", "DE", "SG"];
    countries.sort((a, b) => {
      const aIdx = priorityIso.indexOf(a.isoCode);
      const bIdx = priorityIso.indexOf(b.isoCode);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      count: countries.length,
      data: countries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load locations" },
      { status: 500 }
    );
  }
}
