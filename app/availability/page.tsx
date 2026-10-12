"use client";

import React, { useEffect, useState, useId } from "react";
import { format, addDays, subDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Clock,
  User,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { ResourceAvailability, Resource } from "@/lib/types";
import { ReservationDialog } from "@/components/reservation-dialog";

const TIMELINE_HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

export default function AvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const [resources, setResources] = useState<Resource[]>([]);
  const [availability, setAvailability] = useState<ResourceAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateInputId = useId();
  const resourceFilterId = useId();

  // Create modal state with prefilled slot
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalResourceId, setModalResourceId] = useState<string | undefined>();
  const [modalStartTime, setModalStartTime] = useState<string | undefined>();
  const [modalEndTime, setModalEndTime] = useState<string | undefined>();

  // Fetch resource list for selector
  useEffect(() => {
    fetch("/api/resources?stats=false")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setResources(data.data);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch timeline availability
  const fetchAvailability = () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({
      date: selectedDate,
      ...(resourceFilter !== "ALL" ? { resourceId: resourceFilter } : {}),
    });

    fetch(`/api/availability?${query.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load availability data");
        return res.json();
      })
      .then((data) => {
        setAvailability(data.data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load timeline");
        }
      })
      .finally(() => setLoading(false));

    return controller;
  };

  useEffect(() => {
    const controller = fetchAvailability();
    return () => controller.abort();
  }, [selectedDate, resourceFilter]);

  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    setSelectedDate(subDays(cur, 1).toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    setSelectedDate(addDays(cur, 1).toISOString().split("T")[0]);
  };

  const handleSlotClick = (resourceId: string, startTime: string, endTime: string, isBooked: boolean) => {
    if (isBooked) return; // already booked
    setModalResourceId(resourceId);
    setModalStartTime(startTime);
    setModalEndTime(endTime);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Interactive Availability Matrix</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Timeline & Slots (08:00 – 20:00)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual row per resource. Click any open slot to instantly book without conflict.
          </p>
        </div>

        <button
          onClick={() => {
            setModalResourceId(undefined);
            setModalStartTime(undefined);
            setModalEndTime(undefined);
            setDialogOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition hover:shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Control Bar: Date picker + Navigation + Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
            <CalendarIcon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <input
              id={dateInputId}
              type="date"
              aria-label="Select date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition"
          >
            Today
          </button>
        </div>

        {/* Filter by Resource */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id={resourceFilterId}
            aria-label="Filter by resource"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Resources ({resources.length})</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-teal-50 border border-teal-200 dark:bg-teal-950/30 dark:border-teal-800" />
          <span>Available (Click to book)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-teal-700 dark:bg-teal-600" />
          <span>Confirmed Booking</span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto">
        <div className="min-w-[840px]">
          {/* Header row with hours */}
          <div className="grid grid-cols-13 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400 py-3 px-4">
            <div className="col-span-3 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
              Resource
            </div>
            {TIMELINE_HOURS.map((hour) => (
              <div key={hour} className="text-center font-mono">
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-400 animate-pulse">
              Computing schedule availability...
            </div>
          ) : availability.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-400">
              No matching resources found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {availability.map((item) => (
                <div
                  key={item.resource.id}
                  className="grid grid-cols-13 items-center px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group"
                >
                  {/* Resource Column */}
                  <div className="col-span-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {item.resource.name}
                      </span>
                      {!item.resource.isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
                        {item.resource.type}
                      </span>
                      <span>•</span>
                      <span>Cap: {item.resource.capacity}</span>
                    </div>
                  </div>

                  {/* 12 Hour Slot Columns */}
                  {item.slots.map((slot, index) => {
                    const isBooked = slot.isBooked;
                    return (
                      <div key={index} className="px-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSlotClick(
                              item.resource.id,
                              slot.startTime,
                              slot.endTime,
                              isBooked
                            )
                          }
                          disabled={isBooked || !item.resource.isActive}
                          title={
                            isBooked
                              ? `Reserved by ${slot.reservation?.bookedBy} (${slot.reservation?.purpose})`
                              : !item.resource.isActive
                              ? "Resource is currently inactive"
                              : `Available slot: ${format(new Date(slot.startTime), "HH:mm")} - ${format(new Date(slot.endTime), "HH:mm")} (Click to book)`
                          }
                          className={`w-full h-11 rounded-lg transition-all flex flex-col items-center justify-center text-[10px] font-medium relative group/slot ${
                            isBooked
                              ? "bg-teal-700 dark:bg-teal-600 text-white shadow-xs cursor-not-allowed"
                              : !item.resource.isActive
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-dashed border-slate-200 dark:border-slate-700"
                              : "bg-teal-50/70 hover:bg-teal-100/80 dark:bg-teal-950/20 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40 cursor-pointer hover:border-teal-400 hover:scale-[1.03]"
                          }`}
                        >
                          {isBooked ? (
                            <span className="truncate max-w-[50px] px-1 font-semibold">
                              {slot.reservation?.bookedBy.split(" ")[0]}
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-0 group-hover/slot:opacity-100 font-bold transition">
                              + Book
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reservation Dialog Modal */}
      <ReservationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => fetchAvailability()}
        initialResourceId={modalResourceId}
        initialStartTime={modalStartTime}
        initialEndTime={modalEndTime}
      />
    </div>
  );
}
