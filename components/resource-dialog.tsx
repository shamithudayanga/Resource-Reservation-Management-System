"use client";

import React, { useEffect, useState, useId } from "react";
import { CreateResourceSchema } from "@/lib/validation";
import { Resource, ResourceType } from "@/lib/types";
import { useToast } from "./toast";
import { X, Layers, Users, FileText, Check, Power } from "lucide-react";

interface ResourceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resourceToEdit?: Resource | null;
}

export function ResourceDialog({
  isOpen,
  onClose,
  onSuccess,
  resourceToEdit,
}: ResourceDialogProps) {
  const { success, error: toastError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameInputId = useId();
  const typeSelectId = useId();
  const capacityInputId = useId();
  const descriptionInputId = useId();
  const activeCheckboxId = useId();

  const [formData, setFormData] = useState({
    name: "",
    type: "ROOM" as ResourceType,
    capacity: 10,
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (resourceToEdit) {
      setFormData({
        name: resourceToEdit.name,
        type: resourceToEdit.type,
        capacity: resourceToEdit.capacity,
        description: resourceToEdit.description || "",
        isActive: resourceToEdit.isActive,
      });
    } else {
      setFormData({
        name: "",
        type: "ROOM",
        capacity: 8,
        description: "",
        isActive: true,
      });
    }
    setErrors({});
  }, [isOpen, resourceToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        capacity: Number(formData.capacity),
        description: formData.description || null,
        isActive: formData.isActive,
      };

      const validation = CreateResourceSchema.safeParse(payload);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validation.error.issues) {
          const field = issue.path[0]?.toString() || "general";
          fieldErrors[field] = issue.message;
        }
        setErrors(fieldErrors);
        setSubmitting(false);
        return;
      }

      const url = resourceToEdit ? `/api/resources/${resourceToEdit.id}` : "/api/resources";
      const method = resourceToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ name: "A resource with this name already exists." });
        } else if (res.status === 400 && json.error?.details) {
          const fieldErrors: Record<string, string> = {};
          for (const d of json.error.details) {
            fieldErrors[d.field] = d.message;
          }
          setErrors(fieldErrors);
        } else {
          toastError(json.error?.message || "Failed to save resource.");
        }
        setSubmitting(false);
        return;
      }

      success(resourceToEdit ? "Resource updated successfully!" : "Resource created successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toastError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {resourceToEdit ? "Edit Resource" : "Create New Resource"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add facility rooms, equipment sets, or company vehicles.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor={nameInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Resource Name <span className="text-rose-500">*</span>
            </label>
            <input
              id={nameInputId}
              type="text"
              placeholder="e.g. Executive Boardroom 4A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                errors.name ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
              }`}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Type & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor={typeSelectId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category Type <span className="text-rose-500">*</span>
              </label>
              <select
                id={typeSelectId}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              >
                <option value="ROOM">ROOM (Meeting / Studio)</option>
                <option value="EQUIPMENT">EQUIPMENT (Camera, Drone)</option>
                <option value="VEHICLE">VEHICLE (Van, Shuttle)</option>
              </select>
            </div>

            <div>
              <label htmlFor={capacityInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Capacity (People / Units) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id={capacityInputId}
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                    errors.capacity ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
              </div>
              {errors.capacity && <p className="text-xs text-rose-500 mt-1">{errors.capacity}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor={descriptionInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description & Specifications
            </label>
            <textarea
              id={descriptionInputId}
              rows={3}
              placeholder="Details on hardware specs, display sizes, location instructions, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
            {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description}</p>}
          </div>

          {/* Active status */}
          <div className="pt-2">
            <label htmlFor={activeCheckboxId} className="flex items-center gap-3 cursor-pointer">
              <input
                id={activeCheckboxId}
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Power className={`w-4 h-4 ${formData.isActive ? "text-emerald-500" : "text-slate-400"}`} />
                Resource is Active and available for booking
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{resourceToEdit ? "Update Resource" : "Create Resource"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
