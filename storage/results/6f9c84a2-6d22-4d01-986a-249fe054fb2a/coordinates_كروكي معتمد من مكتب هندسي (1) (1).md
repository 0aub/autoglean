**Step 1: Transcribe the Data**

Decimal Degrees
POINT | Latitude | Longitude
P1 | 27.30589795 | 48.37842866
P2 | 27.30611537 | 48.38316858
P3 | 27.30389182 | 48.38358993
P4 | 27.30278355 | 48.37900889

احداثيات بير
POINT | LATITUDE | LONGITUDE
P1 | 27.3028279° | 48.3790606°

**Step 2: Format the JSON**

```json
{
  "property_corners": [
    { "point": "P1", "latitude": "27.30589795", "longitude": "48.37842866" },
    { "point": "P2", "latitude": "27.30611537", "longitude": "48.38316858" },
    { "point": "P3", "latitude": "27.30389182", "longitude": "48.38358993" },
    { "point": "P4", "latitude": "27.30278355", "longitude": "48.37900889" }
  ],
  "well_coordinates": [
    { "point": "P1", "latitude": "27.3028279°", "longitude": "48.3790606°" }
  ]
}
```