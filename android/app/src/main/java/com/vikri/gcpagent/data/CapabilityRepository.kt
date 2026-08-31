package com.vikri.gcpagent.data

import com.vikri.gcpagent.Capability
import com.vikri.gcpagent.CapabilityCatalog

/**
 * Repositori tunggal data kemampuan.
 * Lapisan data adalah sumber kebenaran (single source of truth) untuk
 * daftar grup & kemampuan — dipakai ViewModel, bukan di layar langsung.
 */
class CapabilityRepository {

    val all: List<Capability>
        get() = CapabilityCatalog.all

    /** Daftar grup dalam urutan katalog. */
    val groups: List<String>
        get() = CapabilityCatalog.groups

    /** Filter kemampuan berdasarkan kata kunci (nama/wawasan/grup) & grup. */
    fun filter(query: String, group: String?): List<Capability> {
        val q = query.trim()
        return all
            .asSequence()
            .filter { group == null || it.group == group }
            .filter { cap ->
                q.isEmpty() ||
                    cap.name.contains(q, ignoreCase = true) ||
                    cap.insight.contains(q, ignoreCase = true) ||
                    cap.group.contains(q, ignoreCase = true)
            }
            .toList()
    }

    /**
     * Grup beserta kemampuan di dalamnya (setelah difilter), tanpa grup kosong.
     * Dipakai untuk daftar ber-sticky-header agar urutan grup tetap konsisten.
     */
    fun groupsWithCapabilities(query: String, group: String?): List<Pair<String, List<Capability>>> {
        val q = query.trim()
        return CapabilityCatalog.groups
            .map { g ->
                val caps = CapabilityCatalog.byGroup(g).filter { cap ->
                    (group == null || cap.group == group) &&
                        (q.isEmpty() ||
                            cap.name.contains(q, ignoreCase = true) ||
                            cap.insight.contains(q, ignoreCase = true) ||
                            cap.group.contains(q, ignoreCase = true))
                }
                g to caps
            }
            .filter { it.second.isNotEmpty() }
    }
}