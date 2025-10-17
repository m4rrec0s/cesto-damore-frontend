"use client";

import CustomizationManager from "../components/customization-manager";

export default function CustomizationsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Customizações</h1>
      <CustomizationManager />
    </div>
  );
}
