"use client";

import React, { useEffect, useState, useId } from "react";
import {
  BookmarkCheck,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
} from "lucide-react";
import { Reservation, Resource } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { ReservationDialog } from "@/components/reservation-dialog";

export default function ReservationsPage() {
  const { success, error: toastError } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const searchInputId = useId();
  const resourceFilterId = useId();
  const statusFilterId = useId();

  // Filters
  const [search, setSearch] = useState("");
  const [resourceId, setResourceId] = useState("ALL");
  const [status, setStatus] = useState<string>("ALL");

  // Dialog & Cancel states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch resources for filter
  useEffect(() => {
    fetch("/api/resources?stats=false")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setResources(data.data);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch reservations
  const fetchReservations = () => {
    const controller = new AbortController();
    setLoading(true);

    const query = new URLSearchParams();
    if (resourceId !== "ALL") query.append("resourceId", resourceId);
    if (status !== "ALL") query.append("status", status);
    if (search.trim()) query.append("search", search.trim());

    fetch(`/api/reservations?${query.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load reservations");
        return res.json();
      })
      .then((data) => {
        setReservations(data.data || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          toastError("Failed to fetch reservations.");
        }
      })
      .finally(() => setLoading(false));

    return controller;
  };

  useEffect(() => {
    const controller = fetchReservations();
    return () => controller.abort();
  }, [resourceId, status, search]);

  const handleCancelReservation = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel reservation");
      success("Reservation cancelled. The resource slot is now released for others.");
      setCancellingId(null);
      fetchReservations();
    } catch {
      toastError("Failed to cancel reservation.");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Master Schedule Registry</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Reservation Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, update, or cancel bookings across facilities and equipment.
          </p>
        </div>

        <button
          onClick={() => {
            setReservationToEdit(null);
            setIsDialogOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition hover:shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id={searchInputId}
            aria-label="Search by booker name or purpose"
            type="text"
            placeholder="Search by booker name or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Resource Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id={resourceFilterId}
            aria-label="Filter by resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Resources</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            id={statusFilterId}
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Resource</th>
                <th className="px-5 py-3.5">Booked By & Purpose</th>
                <th className="px-5 py-3.5">Time Interval</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-400 animate-pulse">
                    Loading reservation records...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <BookmarkCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No reservations match your criteria
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting filters or schedule a new reservation.</p>
                  </td>
                </tr>
              ) : (
                reservations.map((res) => {
                  const isConfirmed = res.status === "CONFIRMED";
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {res.resource?.name || "Resource"}
                        </div>
                        <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase">
                          {res.resource?.type || "ROOM"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{res.bookedBy}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm line-clamp-1">
                          {res.purpose}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(res.startTime)}</span>
                        </div>
                        <div className="text-xs text-slate-400 pl-5">
                          to {formatDateTime(res.endTime)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isConfirmed
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {isConfirmed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{res.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isConfirmed && (
                            <>
                              <button
                                onClick={() => {
                                  setReservationToEdit(res);
                                  setIsDialogOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Edit reservation"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setCancellingId(res.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Cancel reservation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cancel this reservation?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cancelling will release the time slot and immediately permit other users to book this resource.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancellingId(null)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Nevermind
              </button>
              <button
                onClick={() => handleCancelReservation(cancellingId)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                Yes, Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <ReservationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => fetchReservations()}
        reservationToEdit={reservationToEdit}
      />
    </div>
  );
}
