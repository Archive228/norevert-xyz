// USD planning allowances. The remaining amounts already include a 2× reserve.
export const PARTS = [
  { id: 'body', label: 'Body & head', title: 'A face. A shell. An identity.', description: 'The visible layer, from the face display to the last panel on its feet.', items: [
    { model: 'shell', name: '55 exterior panels', cents: 175512, detail: 'Head front and rear, neck, chest, back, arms, pelvis, thighs, knees, shins and feet.' },
    { model: 'head', name: 'Head & interfaces', cents: 34978, detail: 'Face display, visor, inner mount, microphones, speaker and audio wiring. The head shell is counted in the 55 panels.' },
    { model: 'finish', name: 'Shell fitting & finishing', cents: 18000, detail: 'Shell mounting hardware, surface preparation and finishing materials.' },
  ] },
  { id: 'electronics', label: 'Electronics', title: 'The systems inside.', description: 'Vision, onboard compute and the boards that connect software to the body.', items: [
    { model: 'vision', name: 'Vision & extra compute', cents: 160400, detail: 'Jetson, SSD, OAK-D Lite camera, USB and video cables, interconnects and mounts.' },
    { model: 'base', name: 'Base electronics', cents: 83664, detail: 'RDK X5, IMU, RBE power and control board, memory card, RTC battery, antenna and cooling.' },
    { model: 'mounts', name: 'Internal mounting', cents: 9600, detail: 'Computer and PCB brackets, chest mounting plates and supports.' },
    { model: 'power', name: 'Extra module power', cents: 21880, detail: '5 V and 12 V DC converters, power branches and electrical protection.' },
  ] },
  { id: 'assembly', label: 'Connection & assembly', title: 'Make it work together.', description: 'The less visible parts: power, wiring, mechanics and every last connection.', items: [
    { model: 'supply', name: 'Power & switching', cents: 25400, detail: 'Charger, sockets, E-stop, switches, voltmeter, fuse, main leads and battery fixing.' },
    { model: 'mechanics', name: 'Internal mechanics', cents: 27800, detail: 'Bearings, ankle crosspieces, sole pads and carry handle.' },
    { model: 'wiring', name: 'Motor wiring', cents: 48600, detail: 'Motor harnesses, connectors, cable guides and cable protection.' },
    { model: 'fasteners', name: 'Fasteners & supplies', cents: 31760, detail: 'Screws, dowels, spacers and assembly consumables.' },
    { model: 'wrists', name: 'Hand integration', cents: 22396, detail: 'Two wrist adapters, bus boards, wiring and fasteners for both AmazingHand hands.' },
    { model: 'tools', name: 'Commissioning tools', cents: 17200, detail: 'Gamepad, CAN analyzer and calibration jigs.' },
  ] },
];
export const OWNED_CENTS = 734000;
export const REMAINING_CENTS = PARTS.flatMap(group => group.items).reduce((sum, item) => sum + item.cents, 0);
export const usd = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
