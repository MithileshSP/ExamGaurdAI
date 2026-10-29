import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const ranges = [
  { label: '15 min', min: 15 },
  { label: '1 hour', min: 60 },
  { label: '3 hours', min: 180 },
];

export function AppProvider({ children }) {
  const [range, setRange] = useState(ranges[1]);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AppContext.Provider
      value={{
        range,
        setRange,
        collapsed,
        setCollapsed,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
