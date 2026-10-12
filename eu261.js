/*! vuelo-reclama — calculadora EU261 + carta de reclamación · DataFlow Elegance · MIT
 *  Reglamento (CE) 261/2004. Orientativo: no es asesoramiento jurídico.
 */
(function (g) {
  "use strict";
  // IATA: [nombre, lat, lon, ueeee] (ue = UE/EEE/Suiza, ámbito del Reglamento)
  var A = {
    MAD:["Madrid",40.4719,-3.5626,1],BCN:["Barcelona",41.2971,2.0785,1],AGP:["Málaga",36.6749,-4.4991,1],
    PMI:["Palma",39.5517,2.7388,1],ALC:["Alicante",38.2822,-0.5582,1],VLC:["Valencia",39.4893,-0.4816,1],
    SVQ:["Sevilla",37.418,-5.8931,1],BIO:["Bilbao",43.3011,-2.9106,1],LPA:["Gran Canaria",27.9319,-15.3866,1],
    TFS:["Tenerife Sur",28.0445,-16.5725,1],TFN:["Tenerife Norte",28.4827,-16.3415,1],IBZ:["Ibiza",38.8729,1.3731,1],
    SCQ:["Santiago",42.8963,-8.4151,1],LHR:["Londres Heathrow",51.47,-0.4543,0],LGW:["Londres Gatwick",51.1537,-0.1821,0],
    CDG:["París CDG",49.0097,2.5479,1],ORY:["París Orly",48.7262,2.3652,1],AMS:["Ámsterdam",52.3105,4.7683,1],
    FRA:["Fráncfort",50.0379,8.5622,1],MUC:["Múnich",48.3538,11.7861,1],BER:["Berlín",52.3667,13.5033,1],
    FCO:["Roma",41.8003,12.2389,1],MXP:["Milán",45.6306,8.7281,1],LIS:["Lisboa",38.7742,-9.1342,1],
    OPO:["Oporto",41.2481,-8.6814,1],DUB:["Dublín",53.4213,-6.2701,1],BRU:["Bruselas",50.901,4.4844,1],
    ZRH:["Zúrich",47.4647,8.5492,1],VIE:["Viena",48.1103,16.5697,1],CPH:["Copenhague",55.618,12.656,1],
    ARN:["Estocolmo",59.6519,17.9186,1],OSL:["Oslo",60.1976,11.1004,1],HEL:["Helsinki",60.3172,24.9633,1],
    ATH:["Atenas",37.9364,23.9445,1],WAW:["Varsovia",52.1657,20.9671,1],PRG:["Praga",50.1008,14.26,1],
    BUD:["Budapest",47.4369,19.2556,1],IST:["Estambul",41.2753,28.7519,0],CMN:["Casablanca",33.3675,-7.5898,0],
    RAK:["Marrakech",31.6069,-8.0363,0],DXB:["Dubái",25.2532,55.3657,0],JFK:["Nueva York",40.6413,-73.7781,0],
    MIA:["Miami",25.7959,-80.287,0],MEX:["Ciudad de México",19.4363,-99.0721,0],BOG:["Bogotá",4.7016,-74.1469,0],
    EZE:["Buenos Aires",-34.8222,-58.5358,0],LIM:["Lima",-12.0219,-77.1143,0],SCL:["Santiago de Chile",-33.393,-70.7858,0]
  };

  function distancia(o, d) {
    var a = A[o], b = A[d];
    if (!a || !b) return null;
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b[1] - a[1]) * rad, dLon = (b[2] - a[2]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  function importe(km, intraUE) {
    if (km <= 1500) return 250;
    if (intraUE || km <= 3500) return 400;
    return 600;
  }

  /**
   * p = { origen, destino, km (opcional si aeropuertos desconocidos), incidencia:"retraso"|"cancelacion"|"denegacion",
   *       horasRetraso, avisoDias (cancelación), aerolineaUE:bool, extraordinarias:bool,
   *       reubicadoLlegadaRetrasoHoras (opcional, cancelación/denegación con transporte alternativo) }
   */
  function evaluar(p) {
    p = p || {};
    var o = A[p.origen], d = A[p.destino];
    var km = p.km ? Number(p.km) : distancia(p.origen, p.destino);
    if (!km) return { ok: false, motivo: "Indica la distancia en km si tu aeropuerto no está en la lista." };
    var salidaUE = o ? !!o[3] : !!p.salidaUE, llegadaUE = d ? !!d[3] : !!p.llegadaUE;
    var intra = salidaUE && llegadaUE;
    var res = { km: km, intraUE: intra, importe: 0, ok: false, motivos: [] };

    if (!(salidaUE || (llegadaUE && p.aerolineaUE))) {
      res.motivos.push("El vuelo no sale de la UE y no llega a la UE con aerolínea europea: el Reglamento 261/2004 no aplica (revisa la normativa local, p. ej. UK261 en Reino Unido).");
      return res;
    }
    if (p.extraordinarias) {
      res.motivos.push("Con circunstancias extraordinarias probadas (meteorología extrema, huelga de control aéreo, seguridad) no hay compensación económica, pero sí derecho a asistencia y reembolso.");
      return res;
    }
    var inc = p.incidencia || "retraso";
    if (inc === "retraso" && Number(p.horasRetraso) < 3) {
      res.motivos.push("El retraso a la llegada es inferior a 3 horas: no hay compensación económica.");
      return res;
    }
    if (inc === "cancelacion" && Number(p.avisoDias) >= 14) {
      res.motivos.push("Te avisaron de la cancelación con 14 días o más: no hay compensación (sí reembolso o transporte alternativo).");
      return res;
    }
    var base = importe(km, intra);
    var final = base;
    var r = p.reubicadoLlegadaRetrasoHoras;
    if ((inc === "cancelacion" || inc === "denegacion") && r !== undefined && r !== "" && r !== null) {
      var limite = km <= 1500 ? 2 : (intra || km <= 3500 ? 3 : 4);
      if (Number(r) <= limite) {
        final = base / 2;
        res.motivos.push("Te reubicaron y llegaste con ≤" + limite + " h de retraso: la compensación puede reducirse al 50 %.");
      }
    }
    res.ok = true; res.importe = final; res.importeBase = base;
    res.motivos.unshift("Distancia " + km + " km → tramo de " + base + " €.");
    return res;
  }

  function carta(datos, ev) {
    datos = datos || {};
    return "A la atención de " + (datos.aerolinea || "[aerolínea]") + ", Departamento de Atención al Cliente\n\n" +
      "Asunto: Reclamación de compensación — Reglamento (CE) 261/2004 — vuelo " + (datos.vuelo || "[nº vuelo]") + " del " + (datos.fecha || "[fecha]") + "\n\n" +
      "Yo, " + (datos.nombre || "[nombre y apellidos]") + ", con documento " + (datos.documento || "[DNI/pasaporte]") +
      " y reserva " + (datos.reserva || "[localizador]") + ", viajé (o tenía previsto viajar) en el vuelo indicado de " +
      (datos.origen || "[origen]") + " a " + (datos.destino || "[destino]") + ".\n\n" +
      "El vuelo sufrió " + ({ retraso: "un retraso a la llegada de " + (datos.horas || "[X]") + " horas", cancelacion: "una cancelación", denegacion: "una denegación de embarque" }[datos.incidencia] || "una incidencia") +
      ". Conforme a los artículos 5, 7 y concordantes del Reglamento (CE) 261/2004 y la jurisprudencia del TJUE (asuntos C-402/07 y C-432/07, Sturgeon), solicito la compensación de " +
      (ev && ev.ok ? ev.importe : "[importe]") + " € por pasajero, mediante transferencia a la cuenta que les facilitaré.\n\n" +
      "Les ruego respondan en el plazo de 30 días. En caso contrario, me reservo el derecho a acudir a AESA (Agencia Estatal de Seguridad Aérea) o a la vía judicial.\n\n" +
      "Atentamente,\n" + (datos.nombre || "[nombre]") + "\n" + (datos.email || "[email]") + "\n";
  }

  g.VueloReclama = { AEROPUERTOS: A, distancia: distancia, importe: importe, evaluar: evaluar, carta: carta };
})(typeof window !== "undefined" ? window : globalThis);
