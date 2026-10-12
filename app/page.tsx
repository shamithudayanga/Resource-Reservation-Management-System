"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  CalendarCheck,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  User,
  Tag,
} from "lucide-react";
import { DashboardStats, Reservation } from "@/lib/types";
import { formatDateTime, formatTime } from "@/lib/utils";
import { ReservationDialog } from "@/components/reservation-dialog";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchStats = () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/stats", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard metrics");
        return res.json();
      })
      .then((data) => {
        setStats(data.data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load stats");
        }
      })
      .finally(() => setLoading(false));

    return controller;
  };

  useEffect(() => {
    const controller = fetchStats();
    return () => controller.abort();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PrimeWave Centralized Operations</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Resource Reservation Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time facility utilization, equipment tracking, and conflict-free schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Database Exclusion Constraint Badge Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200/60 dark:border-teal-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Strict Database-Level Concurrency Protection
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              PostgreSQL <code className="bg-teal-100 dark:bg-teal-900/60 px-1 py-0.5 rounded text-[11px] font-mono text-teal-800 dark:text-teal-200">btree_gist EXCLUDE</code> constraint prevents double-booking race conditions under high concurrency.
            </p>
          </div>
        </div>
        <Link
          href="/availability"
          className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 shrink-0 self-start sm:self-center"
        >
          <span>View Availability Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Resources */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Resources
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : stats?.totalResources ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({stats?.activeResources ?? 0} currently active)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Rooms, cinema gear, drones, and transport vehicles.
          </p>
        </div>

        {/* Reservations Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Reservations Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : stats?.reservationsToday ?? 0}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {stats?.confirmedReservationsToday ?? 0} confirmed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Scheduled across facilities and equipment today.
          </p>
        </div>

        {/* Utilization Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Weekly Utilization
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : `${stats?.weeklyUtilizationRate ?? 0}%`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              of working capacity
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.weeklyUtilizationRate ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule + Upcoming Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Today&apos;s Reservations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bookings scheduled for today
              </p>
            </div>
            <Link
              href="/availability"
              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>View Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
                Loading today&apos;s reservations...
              </div>
            ) : !stats?.todayReservations || stats.todayReservations.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No reservations scheduled today
                </p>
                <p className="text-xs text-slate-400 mt-1">All resources are open for bookings.</p>
              </div>
            ) : (
              stats.todayReservations.map((res: Reservation) => (
                <div key={res.id} className="py-3.5 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {res.resource?.name || "Resource"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          res.status === "CONFIRMED"
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                      {res.purpose}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {res.bookedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(res.startTime)} – {formatTime(res.endTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Queue */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming Confirmed Bookings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Future bookings ordered chronologically
              </p>
            </div>
            <Link
              href="/reservations"
              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
                Loading upcoming bookings...
              </div>
            ) : !stats?.upcomingReservations || stats.upcomingReservations.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No upcoming reservations
                </p>
                <p className="text-xs text-slate-400 mt-1">Ready for new reservations.</p>
              </div>
            ) : (
              stats.upcomingReservations.map((res: Reservation) => (
                <div key={res.id} className="py-3.5 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {res.resource?.name || "Resource"}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {res.resource?.type || "ROOM"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                      {res.purpose}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {res.bookedBy}
                      </span>
                      <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(res.startTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reservation Dialog Modal */}
      <ReservationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => fetchStats()}
      />
    </div>
  );
}
