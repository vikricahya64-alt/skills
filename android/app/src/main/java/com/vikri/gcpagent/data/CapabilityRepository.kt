package com.vikri.gcpagent.data

import com.vikri.gcpagent.Capability
import com.vikri.gcpagent.CapabilityCatalog

/**
 * Repositori tunggal data kemampuan.
 * Lapisan data adalah sumber kebenaran (single source of truth) untuk
 * daftar grup & kemampuan — dipakai ViewModel, bukan di layar langsung.
 */
class CapabilityRepository {

    private val all: List<Capability>
        get() = CapabilityCatalog.all

    val totalCapabilities: Int
        get() = all.size

    /** Grup beserta kemampuan di dalamnya, tanpa grup kosong. */
    val groupsWithCapabilities: List<Pair<String, List<Capability>>>
        get() = CapabilityCatalog.groups
            .map { group -> group to CapabilityCatalog.byGroup(group) }
            .filter { it.second.isNotEmpty() }
}
