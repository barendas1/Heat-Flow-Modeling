# Heat Flow Simulation - Design Brainstorming

<response>
<text>
**Design Movement**: Neumorphism (Soft UI) + Scientific Dashboard

**Core Principles**:
1. **Tactile Realism**: Controls should feel like physical buttons and sliders on a lab instrument.
2. **Data-First Clarity**: The simulation canvas is the hero; controls are secondary but accessible.
3. **Soft Focus**: Use soft shadows and rounded corners to reduce eye strain during long simulation sessions.
4. **Precision**: Typography and layout must convey scientific accuracy.

**Color Philosophy**:
- **Background**: Soft light gray (#F5F8FB) to match the "lab" feel and reduce contrast fatigue.
- **Primary**: The existing Orange (#f8a24b) represents "Heat" and action.
- **Secondary**: The existing Purple (#3f4492) represents "Cool/Control" and structure.
- **Accents**: Green for success/safe states, Red for danger/hot states.
- **Intent**: Create a calm, clean environment where color indicates temperature and state, not just decoration.

**Layout Paradigm**:
- **Asymmetric Dashboard**: A large central canvas (70% width) flanked by a collapsible right-side control panel (30%).
- **Floating Toolbar**: Essential tools (draw, select, pan) float over the canvas for quick access.
- **Stats Bar**: A slim, persistent bottom bar for real-time statistics (min/max/avg temp).

**Signature Elements**:
- **"Pressed" States**: Active tools look physically pressed into the surface (inner shadows).
- **Glassmorphism Overlays**: Modal dialogs and floating panels use a frosted glass effect to maintain context.
- **Heat Gradient Borders**: Active samples or containers have subtle gradient borders reflecting their temperature.

**Interaction Philosophy**:
- **Direct Manipulation**: Drag-and-drop is the primary interaction model.
- **Immediate Feedback**: Sliders update the simulation in real-time; no "apply" buttons needed.
- **Contextual Controls**: Right-clicking reveals a context menu specific to the object (Sample vs. Container).

**Animation**:
- **Fluid Transitions**: Panels slide in/out smoothly (cubic-bezier).
- **Pulse Effects**: Hot elements gently pulse to indicate activity.
- **Smooth Gradients**: Temperature changes interpolate smoothly over time, not stepping.

**Typography System**:
- **Headings**: Urbanist (Bold/SemiBold) for panel titles and key metrics.
- **Body**: Urbanist (Regular) for labels and descriptions.
- **Monospace**: JetBrains Mono or similar for numerical data to ensure alignment.
</text>
<probability>0.05</probability>
</response>

<response>
<text>
**Design Movement**: Cyberpunk / High-Tech Industrial

**Core Principles**:
1. **High Contrast**: Dark mode default to make the heat map pop vividly.
2. **Holographic UI**: Elements appear projected or glowing against a dark background.
3. **Grid Systems**: Visible grid lines and technical markings to emphasize precision.
4. **Information Density**: Pack more data into the view without clutter using compact controls.

**Color Philosophy**:
- **Background**: Deep charcoal/black (#151515) to simulate a dark lab or screen.
- **Primary**: Neon Orange (#FF9F43) for heat sources.
- **Secondary**: Electric Blue (#00D2D3) for cooling/neutral elements.
- **Text**: White/Light Gray for maximum readability against dark.
- **Intent**: Make the simulation look like a futuristic thermal imaging display.

**Layout Paradigm**:
- **HUD Overlay**: Controls surround the canvas like a Heads-Up Display.
- **Collapsible Drawers**: Top, bottom, left, right drawers for different toolsets.
- **Full-Screen Canvas**: The simulation takes up the entire viewport; UI overlays it.

**Signature Elements**:
- **Glowing Edges**: Active elements have a neon glow.
- **Scanlines**: Subtle scanline texture on the canvas background.
- **Tech Corners**: UI panels have angled corners (45-degree cuts) rather than rounded.

**Interaction Philosophy**:
- **Toggle Switches**: Use mechanical-style toggles instead of checkboxes.
- **Dial Controls**: Rotary knobs for temperature adjustments.
- **Keyboard Shortcuts**: Heavy emphasis on hotkeys for power users.

**Animation**:
- **Glitch Effects**: Subtle glitch on state changes or errors.
- **Scan Sweeps**: A "scan" line moves across the canvas when simulation starts.
- **Snap Transitions**: UI elements snap into place quickly (ease-out-quint).

**Typography System**:
- **Headings**: Rajdhani or Orbitron for a tech feel.
- **Body**: Roboto or Inter for readability.
- **Data**: Fira Code for numbers.
</text>
<probability>0.03</probability>
</response>

<response>
<text>
**Design Movement**: Swiss Style / International Typographic Style

**Core Principles**:
1. **Grid-Based Order**: Strict adherence to a modular grid.
2. **Typography as Interface**: Large, bold type used for hierarchy and controls.
3. **Minimalism**: Strip away all non-essential decoration (shadows, gradients, borders).
4. **Objective Clarity**: The design should be invisible; the data is the star.

**Color Philosophy**:
- **Background**: Stark White (#FFFFFF) or very light gray.
- **Primary**: International Orange (#FF3300) for heat.
- **Secondary**: Cobalt Blue (#0047BB) for cold.
- **Text**: Black (#000000) for maximum contrast.
- **Intent**: Create a gallery-like presentation where the simulation is art.

**Layout Paradigm**:
- **Split Screen**: Fixed 50/50 or 60/40 split between canvas and controls.
- **Sidebar Navigation**: Vertical text navigation on the left.
- **Card-Based Properties**: Properties appear as flat cards in the control area.

**Signature Elements**:
- **Thick Dividers**: Bold black lines separating sections.
- **Huge Numbers**: Temperature readings are displayed in massive font sizes.
- **Geometric Shapes**: UI controls are simple circles and squares.

**Interaction Philosophy**:
- **Click-to-Edit**: Text values are editable in place.
- **Hover Reveals**: Secondary controls only appear on hover to keep the interface clean.
- **Step-Based Workflows**: Wizards for creating complex setups.

**Animation**:
- **None/Minimal**: Instant state changes.
- **Color Shifts**: Background colors change subtly to reflect overall system temperature.

**Typography System**:
- **Headings**: Helvetica Now or Akzidenz-Grotesk (Heavy).
- **Body**: Helvetica Now (Regular).
- **Hierarchy**: Size and weight denote importance, not color.
</text>
<probability>0.02</probability>
</response>
