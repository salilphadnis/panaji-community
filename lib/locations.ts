export type GoaLocation = { id: string; name: string; latitude: number; longitude: number; zoom?: number };

// Approximate town/locality centers for map navigation.
export const GOA_LOCATIONS: GoaLocation[] = [
  { id: "panaji", name: "Panaji (Panjim)", latitude: 15.4909, longitude: 73.8278 },
  { id: "margao", name: "Margao (Madgaon)", latitude: 15.2832, longitude: 73.9862 },
  { id: "vasco", name: "Vasco da Gama", latitude: 15.3982, longitude: 73.8113 },
  { id: "mapusa", name: "Mapusa", latitude: 15.5915, longitude: 73.8089 },
  { id: "ponda", name: "Ponda", latitude: 15.4027, longitude: 74.0159 },
  { id: "porvorim", name: "Porvorim", latitude: 15.5386, longitude: 73.8291 },
  { id: "old-goa", name: "Old Goa", latitude: 15.5011, longitude: 73.9128 },
  { id: "calangute", name: "Calangute", latitude: 15.5439, longitude: 73.7553 },
  { id: "candolim", name: "Candolim", latitude: 15.5181, longitude: 73.7626 },
  { id: "baga", name: "Baga", latitude: 15.5553, longitude: 73.7517 },
  { id: "anjuna", name: "Anjuna", latitude: 15.5736, longitude: 73.7407 },
  { id: "vagator", name: "Vagator", latitude: 15.5973, longitude: 73.7448 },
  { id: "colva", name: "Colva", latitude: 15.2793, longitude: 73.9229 },
  { id: "benaulim", name: "Benaulim", latitude: 15.2647, longitude: 73.9216 },
  { id: "palolem", name: "Palolem", latitude: 15.0103, longitude: 74.0234 },
  { id: "canacona", name: "Canacona", latitude: 15.0140, longitude: 74.0540 },
  { id: "curchorem", name: "Curchorem", latitude: 15.2634, longitude: 74.1086 },
  { id: "bicholim", name: "Bicholim", latitude: 15.5938, longitude: 73.9456 },
  { id: "sanquelim", name: "Sanquelim", latitude: 15.5642, longitude: 74.0077 },
  { id: "pernem", name: "Pernem", latitude: 15.7160, longitude: 73.7950 },
  { id: "quepem", name: "Quepem", latitude: 15.2128, longitude: 74.0780 },
];
