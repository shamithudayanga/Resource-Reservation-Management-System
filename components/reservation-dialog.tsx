"use client";

import React, { useEffect, useState, useId } from "react";
import { CreateReservationSchema } from "@/lib/validation";
import { Resource } from "@/lib/types";
import { useToast } from "./toast";
import { X, Calendar, Clock, User, FileText, Check, AlertCircle } from "lucide-react";

interface ReservationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialResourceId?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  reservationToEdit?: {
    id: string;
    resourceId: string;
    bookedBy: string;
    purpose: string;
    startTime: string;
    endTime: string;
    status: "CONFIRMED" | "CANCELLED";
  } | null;
}

export function ReservationDialog({
  isOpen,
  onClose,
  onSuccess,
  initialResourceId,
  initialStartTime,
  initialEndTime,
  reservationToEdit,
}: ReservationDialogProps) {
  const { success, error: toastError } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resourceSelectId = useId();
  const bookedById = useId();
  const startInputId = useId();
  const endInputId = useId();
  const purposeInputId = useId();

  // Helper to format ISO to datetime-local input string YYYY-MM-DDTHH:mm
  const toLocalInputFormat = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    resourceId: initialResourceId || "",
    bookedBy: "",
    purpose: "",
    startTime: "",
    endTime: "",
  });

  // Fetch active resources for the selector
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setLoadingResources(true);

    fetch("/api/resources?stats=false", { signal: controller.signal })
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setResources(res.data);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load resources:", err);
        }
      })
      .finally(() => setLoadingResources(false));

    return () => controller.abort();
  }, [isOpen]);

  // Set initial values
  useEffect(() => {
    if (!isOpen) return;

    if (reservationToEdit) {
      setFormData({
        resourceId: reservationToEdit.resourceId,
        bookedBy: reservationToEdit.bookedBy,
        purpose: reservationToEdit.purpose,
        startTime: toLocalInputFormat(reservationToEdit.startTime),
        endTime: toLocalInputFormat(reservationToEdit.endTime),
      });
    } else {
      // Default to next nearest hour
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const start = initialStartTime ? new Date(initialStartTime) : new Date(now.getTime() + 60 * 60 * 1000);
      const end = initialEndTime ? new Date(initialEndTime) : new Date(start.getTime() + 60 * 60 * 1000);

      setFormData({
        resourceId: initialResourceId || "",
        bookedBy: "",
        purpose: "",
        startTime: toLocalInputFormat(start.toISOString()),
        endTime: toLocalInputFormat(end.toISOString()),
      });
    }
    setErrors({});
  }, [isOpen, reservationToEdit, initialResourceId, initialStartTime, initialEndTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const startIso = formData.startTime ? new Date(formData.startTime).toISOString() : "";
      const endIso = formData.endTime ? new Date(formData.endTime).toISOString() : "";

      const payload = {
        resourceId: formData.resourceId,
        bookedBy: formData.bookedBy,
        purpose: formData.purpose,
        startTime: startIso,
        endTime: endIso,
        status: "CONFIRMED" as const,
      };

      // Client-side Zod validation
      const validation = CreateReservationSchema.safeParse(payload);
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

      const url = reservationToEdit ? `/api/reservations/${reservationToEdit.id}` : "/api/reservations";
      const method = reservationToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toastError(json.error?.message || "Time conflict: This slot is already booked.");
          setErrors({ general: json.error?.message || "Time conflict: This slot is already booked." });
        } else if (res.status === 400 && json.error?.details) {
          const fieldErrors: Record<string, string> = {};
          for (const d of json.error.details) {
            fieldErrors[d.field] = d.message;
          }
          setErrors(fieldErrors);
        } else {
          toastError(json.error?.message || "Failed to save reservation.");
        }
        setSubmitting(false);
        return;
      }

      success(reservationToEdit ? "Reservation updated successfully!" : "Reservation confirmed successfully!");
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
              {reservationToEdit ? "Edit Reservation" : "Book a Resource"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Guaranteed conflict-free scheduling backed by PostgreSQL GiST constraints.
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
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Resource Selector */}
          <div>
            <label htmlFor={resourceSelectId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Target Resource <span className="text-rose-500">*</span>
            </label>
            <select
              id={resourceSelectId}
              value={formData.resourceId}
              onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                errors.resourceId ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
              }`}
            >
              <option value="">-- Choose a Resource --</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id} disabled={!r.isActive}>
                  {r.name} ({r.type}) {!r.isActive ? "— [INACTIVE]" : `— Cap: ${r.capacity}`}
                </option>
              ))}
            </select>
            {errors.resourceId && <p className="text-xs text-rose-500 mt-1">{errors.resourceId}</p>}
          </div>

          {/* Booked By */}
          <div>
            <label htmlFor={bookedById} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Booked By (Full Name / Team) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id={bookedById}
                type="text"
                placeholder="e.g. Elena Rostova or Mobile Platform Team"
                value={formData.bookedBy}
                onChange={(e) => setFormData({ ...formData, bookedBy: e.target.value })}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                  errors.bookedBy ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>
            {errors.bookedBy && <p className="text-xs text-rose-500 mt-1">{errors.bookedBy}</p>}
          </div>

          {/* Time range: Start & End */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor={startInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id={startInputId}
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={`w-full pl-10 pr-2 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                    errors.startTime ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
              </div>
              {errors.startTime && <p className="text-xs text-rose-500 mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <label htmlFor={endInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                End Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id={endInputId}
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={`w-full pl-10 pr-2 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                    errors.endTime ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
              </div>
              {errors.endTime && <p className="text-xs text-rose-500 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label htmlFor={purposeInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Purpose / Agenda <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id={purposeInputId}
                type="text"
                placeholder="e.g. Sprint Planning, Client Demo, Video Shoot"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                  errors.purpose ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>
            {errors.purpose && <p className="text-xs text-rose-500 mt-1">{errors.purpose}</p>}
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
                <span>Validating & Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{reservationToEdit ? "Save Changes" : "Confirm Reservation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
