"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortSha(sha) {
  return sha ? sha.slice(0, 7) : "—";
}

function StatusBadge({ state }) {
  const styles = {
    ok: "bg-green-500/10 text-green-600 dark:text-green-400",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    unknown: "bg-black/5 dark:bg-white/10 text-text-muted",
  };
  const labels = { ok: "Up to date", warn: "Update available", unknown: "Unknown" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}

StatusBadge.propTypes = { state: PropTypes.oneOf(["ok", "warn", "unknown"]).isRequired };

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-text-muted shrink-0">{label}</span>
      <span className="text-sm text-text-main text-right break-all">{children}</span>
    </div>
  );
}

Row.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
};

function RepoCard({ title, data }) {
  const state = data.error ? "unknown" : data.updateAvailable === true ? "warn" : data.updateAvailable === false ? "ok" : "unknown";
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <a
          href={data.repoUrl}
          target="_blank"
          rel="noreferrer"
          title={data.repo}
          className="font-medium text-text-main hover:underline inline-flex items-center gap-1.5"
        >
          {title}
        </a>
        <StatusBadge state={state} />
      </div>
      <div className="divide-y divide-black/5 dark:divide-white/5">
        {data.error ? (
          <div className="text-red-500 text-sm py-2">{data.error}</div>
        ) : (
          <>
            {data.currentVersion && (
              <Row label="Installed version">
                <code className="text-xs">{data.currentVersion}</code>
              </Row>
            )}
            {data.channel === "release" ? (
              <Row label="Latest release">
                <span className="inline-flex items-center gap-2">
                  <code className="text-xs">{data.latestVersion || "—"}</code>
                  <a href={data.latestUrl} target="_blank" rel="noreferrer" className="text-xs text-text-muted hover:underline">
                    view
                  </a>
                </span>
              </Row>
            ) : (
              <Row label="Latest commit">
                <span className="inline-flex items-center gap-2">
                  <code className="text-xs">{shortSha(data.latestSha)}</code>
                  <a href={data.latestUrl} target="_blank" rel="noreferrer" className="text-xs text-text-muted hover:underline">
                    view
                  </a>
                </span>
              </Row>
            )}
            {data.latestDate && <Row label="Published">{formatDate(data.latestDate)}</Row>}
            {data.notes && <Row label="Notes">{data.notes}</Row>}
            {data.localSha && (
              <Row label="Local commit">
                <code className="text-xs">
                  {shortSha(data.localSha)}
                  {data.localBranch ? ` (${data.localBranch})` : ""}
                </code>
              </Row>
            )}
            {data.remoteSha && <Row label="Remote commit">{shortSha(data.remoteSha)}</Row>}
            {data.remoteDate && <Row label="Remote updated">{formatDate(data.remoteDate)}</Row>}
            {data.updateAvailable === true && data.npmUpdateCmd && (
              <Row label="Update command">
                <code className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded">{data.npmUpdateCmd}</code>
              </Row>
            )}
            {data.compareUrl && (
              <div className="pt-2">
                <a
                  href={data.compareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-text-muted hover:underline inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">difference</span>
                  Compare local...remote on GitHub
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

RepoCard.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.shape({
    repo: PropTypes.string,
    repoUrl: PropTypes.string,
    error: PropTypes.string,
    currentVersion: PropTypes.string,
    channel: PropTypes.string,
    latestVersion: PropTypes.string,
    latestSha: PropTypes.string,
    latestDate: PropTypes.string,
    latestUrl: PropTypes.string,
    notes: PropTypes.string,
    localSha: PropTypes.string,
    localBranch: PropTypes.string,
    remoteSha: PropTypes.string,
    remoteDate: PropTypes.string,
    compareUrl: PropTypes.string,
    npmUpdateCmd: PropTypes.string,
    updateAvailable: PropTypes.bool,
  }).isRequired,
};

export default function UpdateCheckModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const modalRef = useRef(null);

  // Sets state only from promise callbacks; the caller owns the spinner
  const load = useCallback(() => {
    fetch("/api/github-updates", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError("");
      })
      .catch((err) => setError(err.message || "Failed to check updates"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-semibold text-text-main">GitHub Updates</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setLoading(true); load(); }}
              disabled={loading}
              className="p-1.5 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Re-check now"
            >
              <span className={`material-symbols-outlined text-[20px] ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {loading && !data && (
            <div className="flex items-center justify-center py-10 text-text-muted">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Checking GitHub...
            </div>
          )}
          {error && !data && <div className="text-red-500 py-4">Failed to check updates: {error}</div>}
          {data?.official && <RepoCard title="Official Upstream" data={data.official} />}
          {data?.mibp && <RepoCard title="Fork Build (freebuff)" data={data.mibp} />}
          {data?.own && <RepoCard title="Unlimited Router (installed)" data={data.own} />}
          {data && (
            <p className="text-xs text-text-muted text-center">
              Checked {formatDate(data.fetchedAt)}
              {data.cached ? " (cached)" : ""}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

UpdateCheckModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
