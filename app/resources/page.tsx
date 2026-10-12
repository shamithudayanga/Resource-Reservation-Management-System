"use client";

import React, { useEffect, useState, useId } from "react";
import {
  Layers,
  Plus,
  Users,
  Clock,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Power,
  Trash2,
  AlertTriangle,
  Building2,
  Video,
  Car,
} from "lucide-react";
import { Resource, ResourceType } from "@/lib/types";
import { useToast } from "@/components/toast";
import { ResourceDialog } from "@/components/resource-dialog";

export default function ResourcesPage() {
  const { success, error: toastError } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const typeFilterId = useId();

  // Dialog & Delete states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const fetchResources = () => {
    const controller = new AbortController();
    setLoading(true);

    fetch("/api/resources?stats=true", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load resources");
        return res.json();
      })
      .then((data) => {
        setResources(data.data || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          toastError("Failed to fetch resources.");
        }
      })
      .finally(() => setLoading(false));

    return controller;
  };

  useEffect(() => {
    const controller = fetchResources();
    return () => controller.abort();
  }, []);

  const handleToggleActive = async (resource: Resource) => {
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !resource.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      success(`Resource "${resource.name}" is now ${!resource.isActive ? "Active" : "Inactive"}.`);
      fetchResources();
    } catch {
      toastError("Failed to update resource status.");
    }
  };

  const handleDeleteResource = async (id: string) => {
    setDeleteErrorMessage(null);
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        // Resource has future bookings or other blocking reason
        setDeleteErrorMessage(data.error?.message || "Cannot delete this resource.");
        return;
      }

      success("Resource removed successfully.");
      setDeletingResource(null);
      fetchResources();
    } catch {
      toastError("Network error while deleting resource.");
    }
  };

  const filteredResources = resources.filter((r) => {
    if (typeFilter === "ALL") return true;
    return r.type === typeFilter;
  });

  const getIconForType = (type: ResourceType) => {
    switch (type) {
      case "ROOM":
        return <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case "EQUIPMENT":
        return <Video className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case "VEHICLE":
        return <Car className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Organization Asset Catalog</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Shared Resources & Facilities
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage rooms, cinema kits, drones, and transport vehicles with utilization metrics.
          </p>
        </div>

        <button
          onClick={() => {
            setResourceToEdit(null);
            setIsDialogOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition hover:shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5">
          {["ALL", "ROOM", "EQUIPMENT", "VEHICLE"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                typeFilter === type
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {type === "ALL" ? `All Resources (${resources.length})` : type}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="py-24 text-center text-sm text-slate-400 animate-pulse">
          Loading resource catalog...
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No resources found in this category
          </p>
          <p className="text-xs text-slate-400 mt-1">Add a new resource to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const utilizationRate = res.stats?.utilizationRate ?? 0;
            return (
              <div
                key={res.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
                        {getIconForType(res.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1">
                          {res.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                          {res.type} • Cap: {res.capacity}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        res.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {res.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                    {res.description || "No specific hardware instructions provided."}
                  </p>
                </div>

                {/* Utilization & Usage Stats */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {res.stats?.totalHours ?? 0} hrs booked
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <BookmarkCheck className="w-3.5 h-3.5 text-slate-400" />
                      {res.stats?.reservationCount ?? 0} bookings
                    </span>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      <span>Capacity Utilization</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{utilizationRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${utilizationRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100/60 dark:border-slate-800/60">
                    <button
                      onClick={() => handleToggleActive(res)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                        res.isActive
                          ? "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
                      }`}
                      title={res.isActive ? "Deactivate resource" : "Activate resource"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{res.isActive ? "Deactivate" : "Activate"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setResourceToEdit(res);
                          setIsDialogOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit resource"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteErrorMessage(null);
                          setDeletingResource(res);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete &quot;{deletingResource.name}&quot;?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Resources with future confirmed reservations cannot be deleted to preserve organizational commitments. You can deactivate them instead.
              </p>
            </div>

            {deleteErrorMessage && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
                {deleteErrorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingResource(null)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              {!deleteErrorMessage ? (
                <button
                  onClick={() => handleDeleteResource(deletingResource.id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition"
                >
                  Confirm Delete
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleToggleActive(deletingResource);
                    setDeletingResource(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition"
                >
                  Deactivate Instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resource Dialog */}
      <ResourceDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => fetchResources()}
        resourceToEdit={resourceToEdit}
      />
    </div>
  );
}
