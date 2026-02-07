# Intercity Taxi Booking Calculator

A React.js single-page component for calculating intercity taxi travel prices with Persian/RTL support.

## Features

- ✅ RTL (Right-to-Left) layout for Persian/Farsi
- ✅ Mobile-first responsive design
- ✅ Modern Material Design-inspired UI
- ✅ Persian fonts (Vazirmatn)
- ✅ Interactive map for origin/destination selection (Neshan Maps)
- ✅ Complete booking form with validation
- ✅ Jalali (Persian) date picker
- ✅ Mock API integration ready
- ✅ Results display with sorting

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Neshan Maps SDK (Leaflet) - [Documentation](https://platform.neshan.org/docs/sdk/web/leaflet/examples/leaflet-add-marker/)
- Functional components with Hooks only

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Neshan Maps API Key:
   - Register at [Neshan Platform](https://platform.neshan.org/panel) (free registration)
   - Create a new API key and select "نقشه وب" (Web Map) option
   - Create a `.env` file in the root directory:
     ```env
     VITE_NESHAN_API_KEY=your_api_key_here
     ```
   - Or you can directly edit `src/App.jsx` and replace `YOUR_API_KEY` with your actual API key

## Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

Build the project for production:
```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## WordPress Integration

To embed this component in WordPress:

1. Build the project:
   ```bash
   npm run build
   ```

2. Copy the contents of the `dist` folder to your WordPress theme directory (e.g., `wp-content/themes/your-theme/js/intercity/`)

3. Enqueue the CSS and JS files in your theme's `functions.php`:
   ```php
   function enqueue_intercity_calculator() {
       wp_enqueue_style('intercity-css', get_template_directory_uri() . '/js/intercity/assets/index-[hash].css');
       wp_enqueue_script('intercity-js', get_template_directory_uri() . '/js/intercity/assets/index-[hash].js', array(), '1.0.0', true);
   }
   add_action('wp_enqueue_scripts', 'enqueue_intercity_calculator');
   ```

4. Add a shortcode or widget to display the component:
   ```php
   function intercity_calculator_shortcode() {
       return '<div id="root"></div>';
   }
   add_shortcode('intercity_calculator', 'intercity_calculator_shortcode');
   ```

## Project Structure

```
intercity/
├── src/
│   ├── components/
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Stepper.jsx
│   │   ├── DatePicker.jsx
│   │   ├── TimePicker.jsx
│   │   ├── CarTypeSelector.jsx
│   │   ├── MapSelector.jsx
│   │   └── Results.jsx
│   ├── utils/
│   │   └── jalaliDate.js
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── mockData.js
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Form Fields

- Origin and Destination selection via interactive map (click on map to select)
- Car type selection (card-based)
- Passenger count (stepper)
- Luggage count (stepper)
- Jalali date picker
- Time picker
- Return trip checkbox
- Driver food & accommodation checkbox
- Car stop hours (toggle + input)
- Wheelchair option
- Pet option

## API Integration

The component uses a mock API function (`calculatePrice` in `mockData.js`). To integrate with a real API:

1. Replace the `calculatePrice` function in `src/mockData.js`
2. Update the API endpoint URL
3. Adjust the request/response format as needed

Example:
```javascript
export const calculatePrice = async (formData) => {
  const response = await fetch('/api/calculate-price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });
  return response.json();
};
```

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme.

### Fonts
The project uses Vazirmatn font. To change it, update the font import in `index.html` and the font family in `tailwind.config.js`.

### Car Types
Edit the `carTypes` array in `src/mockData.js`.

### Map Configuration
The map uses Neshan Maps SDK. To customize:
- Change default center/zoom in `src/components/MapSelector.jsx`
- Modify marker icons or colors
- Adjust map type (neshan, standard, etc.)

## License

MIT

