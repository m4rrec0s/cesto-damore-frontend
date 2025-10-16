"use client";

import { useState, useEffect } from "react";
import { useApi, FeedConfiguration } from "../../hooks/use-api";
import { useAuth } from "../../hooks/use-auth";
import FeedManager from "../components/feed-manager";
import { useRouter } from "next/navigation";

export default function FeedPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [feedConfigurations, setFeedConfigurations] = useState<
    FeedConfiguration[]
  >([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    const loadFeedConfigurations = async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          const feedData = await api.getFeedConfigurations();
          setFeedConfigurations(feedData);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do feed:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadFeedConfigurations();
    }
  }, [api, isAdmin, authLoading, user, router]);

  const handleDataUpdate = () => {
    api.invalidateCache();
    const loadFeedConfigurations = async () => {
      try {
        if (isAdmin) {
          const feedData = await api.getFeedConfigurations();
          setFeedConfigurations(feedData);
        }
      } catch (error) {
        console.error("Erro ao recarregar configurações do feed:", error);
      }
    };
    loadFeedConfigurations();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando feed...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <FeedManager
        configurations={feedConfigurations}
        onUpdate={handleDataUpdate}
        api={api}
      />
    </div>
  );
}
