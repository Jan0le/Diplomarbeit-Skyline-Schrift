import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { getFlightTimes, parseFlightNumberParts, toYYYYMMDD } from './services/flightApi';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState([]);

  const RESULTS_DIR = FileSystem.documentDirectory + 'scanresults';
  const RESULTS_FILE = RESULTS_DIR + '/flugtickets.json';
  const DEFAULT_BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';
  const [backendUrl] = useState(DEFAULT_BACKEND_URL);

  const julianToISODate = (julian) => {
    if (!julian) return null;
    const now = new Date();
    const year = now.getUTCFullYear();
    const firstDay = new Date(Date.UTC(year, 0, 1));
    const dayNum = Number(julian);
    if (!Number.isFinite(dayNum) || dayNum <= 0) return null;
    const date = new Date(firstDay);
    date.setUTCDate(dayNum);
    // Heuristik: wenn Datum weit in der Vergangenheit liegt, nächstes Jahr annehmen
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return date.toISOString().slice(0, 10);
  };

  const normalizeName = (raw) => {
    if (!raw) return null;
    const s = raw.trim().replace(/\s+/g, ' ');
    if (!s) return null;
    if (s.includes('/')) {
      const [last, rest] = s.split('/');
      const first = (rest || '').split(' ')[0] || '';
      const full = `${first.trim()} ${last.trim()}`.trim();
      return full || s;
    }
    return s;
  };

  // Minimaler IATA-BCBP-Parser (Pflichtfelder, Leg 1)
  const parseBCBP = (raw) => {
    const s = (raw ?? '').toString().trim();
    if (!s || s.length < 58 || s[0] !== 'M') return null;
    try {
      const nameRaw = s.substring(2, 22);
      const pnr = s.substring(23, 30).trim() || null;
      const from = s.substring(30, 33).trim() || null;
      const to = s.substring(33, 36).trim() || null;
      const carrier = s.substring(36, 39).trim();
      const flightNoRaw = s.substring(39, 44).trim();
      const julian = s.substring(44, 47).trim();
      const seat = s.substring(48, 52).trim() || null;

      const name = normalizeName(nameRaw);
      const flightNoNum = flightNoRaw.replace(/^0+/, '') || flightNoRaw;
      const flightNo = `${carrier}${flightNoNum}`;
      const flightDate = julianToISODate(julian);

      return {
        passenger: { name: name || null },
        flight: {
          number: flightNo || null,
          date: flightDate || null,
          departure: { airport: from, datetime: null },
          arrival: { airport: to, datetime: null },
        },
        seat,
        pnr,
      };
    } catch (e) {
      return null;
    }
  };

  const enrichWithFlightTimes = async (entry) => {
    try {
      const fullNum = entry?.flight?.number || null;
      const isoDate = entry?.flight?.date || null;
      if (!fullNum || !isoDate) return entry;

      const { airlineCode, flightNumber } = parseFlightNumberParts(fullNum);
      const yyyymmdd = toYYYYMMDD(isoDate);
      if (!airlineCode || !flightNumber || !yyyymmdd) return entry;

      const times = await getFlightTimes(flightNumber, airlineCode, yyyymmdd);
      const departureTime = times?.departureTime || null;
      const arrivalTime = times?.arrivalTime || null;
      const departureActual = times?.departureActual || null;
      const arrivalActual = times?.arrivalActual || null;
      const status = times?.status ?? null;

      return {
        ...entry,
        flight: {
          ...entry.flight,
          status: status ?? entry.flight?.status ?? null,
          departure: { ...entry.flight.departure, scheduledTime: departureTime, actualTime: departureActual },
          arrival: { ...entry.flight.arrival, scheduledTime: arrivalTime, actualTime: arrivalActual },
        },
      };
    } catch (_) {
      return entry;
    }
  };

  React.useEffect(() => {
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(RESULTS_FILE);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(RESULTS_FILE);
          const parsed = JSON.parse(content);
          // Support both new shape and legacy array-only shape
          if (Array.isArray(parsed)) {
            setScannedData(parsed);
          } else if (parsed && Array.isArray(parsed.flightTicketScan)) {
            setScannedData(parsed.flightTicketScan);
          }
        }
      } catch (_) {
        // ignore load errors
      }
    })();
  }, []);

  const buildTicketFromScan = (scan, source = 'camera') => {
    const typeRaw = (scan?.type || 'unknown').toString();
    const rawString = (scan?.data ?? '').toString();
    const rawTrim = rawString.trim();

    let parsed = null;
    if (/^M[1-4]/.test(rawTrim)) {
      parsed = parseBCBP(rawTrim);
    } else {
      const idx = rawTrim.indexOf('M1');
      if (idx >= 0) {
        const candidate = rawTrim.slice(idx);
        if (candidate.length >= 58) parsed = parseBCBP(candidate);
      }
    }

    return {
      passenger: { name: parsed?.passenger?.name ?? null },
      flight: {
        number: parsed?.flight?.number ?? null,
        date: parsed?.flight?.date ?? null,
        departure: {
          airport: parsed?.flight?.departure?.airport ?? null,
          datetime: parsed?.flight?.departure?.datetime ?? null,
        },
        arrival: {
          airport: parsed?.flight?.arrival?.airport ?? null,
          datetime: parsed?.flight?.arrival?.datetime ?? null,
        },
      },
      seat: parsed?.seat ?? null,
      pnr: parsed?.pnr ?? null,
      barcodeType: typeRaw.toUpperCase() || 'UNKNOWN',
      rawData: rawString,
      scanTimestamp: new Date().toISOString(),
      source,
    };
  };

  const saveResults = async (resultsArray) => {
    try {
      await FileSystem.makeDirectoryAsync(RESULTS_DIR, { intermediates: true });
      const container = { flightTicketScan: resultsArray };
      await FileSystem.writeAsStringAsync(RESULTS_FILE, JSON.stringify(container, null, 2));
    } catch (err) {
      console.warn('Speichern fehlgeschlagen:', err);
    }
  };

  const handleBarCodeScanned = async (result) => {
    const entry = buildTicketFromScan(result);
    const enriched = await enrichWithFlightTimes(entry);
    setScannedData(prev => {
      const next = [...prev, enriched];
      saveResults(next);
      return next;
    });
    setScanning(false);
  };

  const pickImageAndScan = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets?.length) return;
    try {
      const uri = result.assets[0].uri;
      const { BarCodeScanner } = await import('expo-barcode-scanner');
      const detections = await BarCodeScanner.scanFromURLAsync(uri);
      if (!detections?.length) {
        alert('Kein Barcode im Bild gefunden.');
        return;
      }
      const enrichedEntries = [];
      for (const d of detections) {
        const entry = buildTicketFromScan({ type: d.type, data: d.data }, 'gallery');
        const enriched = await enrichWithFlightTimes(entry);
        enrichedEntries.push(enriched);
      }
      setScannedData(prev => {
        const next = [...prev, ...enrichedEntries];
        saveResults(next);
        return next;
      });
    } catch (e) {
      alert('Galerie-Scan ist in dieser Expo Go Umgebung nicht verfügbar. Bitte mit Kamera scannen oder Development Build nutzen.');
    }
  };

  const saveAsJSON = async () => {
    try {
      await saveResults(scannedData);
      alert('Scan-Ergebnisse gespeichert unter scanresults/flugtickets.json!');
    } catch (err) {
      alert('Fehler beim Speichern: ' + err);
    }
  };

  const exportJsonToVisibleFolder = async () => {
    try {
      const container = { flightTicketScan: scannedData };
      const pretty = JSON.stringify(container, null, 2);

      if (Platform.OS !== 'android') {
        await saveResults(scannedData);
        alert('Export in sichtbaren Ordner ist hier nur auf Android verfügbar. Datei wurde intern gespeichert unter scanresults/flugtickets.json');
        return;
      }

      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions?.granted) {
        alert('Export abgebrochen: Es wurde kein Ordner ausgewählt.');
        return;
      }

      const baseUri = permissions.directoryUri;
      const ts = new Date();
      const fname = `flugtickets-${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}-${String(ts.getMinutes()).padStart(2, '0')}-${String(ts.getSeconds()).padStart(2, '0')}.json`;

      let fileUri;
      try {
        fileUri = await FileSystem.StorageAccessFramework.createFileAsync(baseUri, fname, 'application/json');
      } catch (_) {
        fileUri = await FileSystem.StorageAccessFramework.createFileAsync(baseUri, `flugtickets-${Date.now()}.json`, 'application/json');
      }

      await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, pretty);

      alert(`JSON gespeichert im ausgewählten Ordner.\nDatei: ${fname}\nOrt: ${fileUri}\n\nTipp: Öffne die Dateien-App und gehe in den gewählten Ordner (z. B. "Downloads").`);
    } catch (err) {
      alert('Fehler beim Export: ' + (err?.message || String(err)));
    }
  };

  const saveToProjectFolderViaBackend = async () => {
    try {
      const resp = await fetch(backendUrl + '/save-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightTicketScan: scannedData })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Unbekannter Fehler');
      alert(`Im Projektordner gespeichert.\nPfad: ${data.path}`);
    } catch (err) {
      alert('Fehler beim Speichern im Projektordner: ' + (err?.message || String(err)) + `\nHinweis: Stelle sicher, dass der Backend-Server läuft unter ${backendUrl}`);
    }
  };

  if (!permission) {
    return <Text>Lade Berechtigungen…</Text>;
  }
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ marginBottom: 8 }}>Kamera-Zugriff benötigt.</Text>
        <Button title="Zugriff erlauben" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flugticket-Barcode-Scanner (Expo, Kamera)</Text>

      {scanning ? (
        <View style={{ flex: 1, width: '100%', height: 400 }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr', 'ean13', 'ean8', 'upc_e', 'code39', 'code128', 'pdf417', 'aztec', 'itf14', 'datamatrix'
              ]
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <Button title="Abbrechen" onPress={() => setScanning(false)} />
        </View>
      ) : (
        <>
          <Button title="Barcode mit Kamera scannen" onPress={() => setScanning(true)} />
          <Button title="Bild aus Galerie wählen" onPress={pickImageAndScan} />
          <Button title="Scan-Ergebnisse als JSON speichern" onPress={saveAsJSON} />
          <Button title="In sichtbaren Ordner exportieren (Android)" onPress={exportJsonToVisibleFolder} />
          <Button title="Im Projektordner speichern (Backend)" onPress={saveToProjectFolderViaBackend} />
          <Text style={{ marginTop: 16 }}>Formatierte Ergebnisse:</Text>
          <ScrollView style={{ maxHeight: 220, width: '100%' }}>
            {scannedData.map((item, idx) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.line}><Text style={styles.label}>Name: </Text>{item?.passenger?.name ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Flug: </Text>{item?.flight?.number ?? '-'} ({item?.flight?.date ?? '-'})</Text>
                <Text style={styles.line}><Text style={styles.label}>Von: </Text>{item?.flight?.departure?.airport ?? '-'}   <Text style={styles.label}>Nach: </Text>{item?.flight?.arrival?.airport ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Sitz: </Text>{item?.seat ?? '-'}   <Text style={styles.label}>PNR: </Text>{item?.pnr ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Abflug (plan): </Text>{item?.flight?.departure?.scheduledTime ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Abflug (ist): </Text>{item?.flight?.departure?.actualTime ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Ankunft (plan): </Text>{item?.flight?.arrival?.scheduledTime ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Ankunft (ist): </Text>{item?.flight?.arrival?.actualTime ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Status: </Text>{item?.flight?.status ?? '-'}</Text>
                <Text style={styles.line}><Text style={styles.label}>Typ: </Text>{item?.barcodeType ?? '-'}   <Text style={styles.label}>Zeit: </Text>{item?.scanTimestamp ?? '-'}</Text>
              </View>
            ))}
          </ScrollView>
          <Text style={{ marginTop: 16 }}>Formatiert (JSON mit flightTicketScan):</Text>
          <ScrollView style={{ maxHeight: 260, width: '100%' }}>
            <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {JSON.stringify({ flightTicketScan: scannedData }, null, 2)}
            </Text>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 42, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  card: { padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 8, backgroundColor: '#fafafa' },
  label: { fontWeight: 'bold' },
  line: { fontSize: 12, marginBottom: 2 },
});
