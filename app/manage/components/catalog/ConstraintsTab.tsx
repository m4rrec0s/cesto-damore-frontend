"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Link2 } from "lucide-react";
import { ConstraintsManager } from "../constraints-manager";

export function ConstraintsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Restrições de Itens
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Configure regras de dependência e exclusividade entre itens e
          adicionais
        </p>
      </CardHeader>
      <CardContent>
        <ConstraintsManager />
      </CardContent>
    </Card>
  );
}
