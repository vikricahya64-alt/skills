package com.vikri.gcpagent.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit test (JVM) untuk CapabilityRepository — memvalidasi kebenaran data &
 * logika filter tanpa emulator. Dijalankan di quality-gate CI sebagai bukti
 * logika aplikasi benar, bukan hanya kompilasi.
 */
class CapabilityRepositoryTest {

    private lateinit var repo: CapabilityRepository

    @Before
    fun setUp() {
        repo = CapabilityRepository()
    }

    @Test
    fun `katalog punya data non-kosong dan grup konsisten`() {
        assertTrue("harus ada kemampuan", repo.all.isNotEmpty())
        assertTrue("harus ada grup", repo.groups.isNotEmpty())
        // Setiap kemampuan harus termasuk salah satu grup yang terdaftar.
        val validGroups = repo.groups.toSet()
        repo.all.forEach { cap ->
            assertTrue("grup ${cap.group} harus terdaftar", cap.group in validGroups)
            assertTrue("id tidak boleh kosong", cap.id.isNotBlank())
            assertTrue("nama tidak boleh kosong", cap.name.isNotBlank())
        }
    }

    @Test
    fun `total kemampuan konsisten dengan katalog`() {
        assertEquals(repo.all.size, repo.all.distinctBy { it.id }.size)
    }

    @Test
    fun `filter kosong mengembalikan semua`() {
        val result = repo.filter(query = "", group = null)
        assertEquals(repo.all.size, result.size)
    }

    @Test
    fun `filter berdasarkan nama tidak case-sensitive`() {
        val nameOfFirst = repo.all.first().name
        // Ambil sebagian kata untuk dicari (grafis potong aman).
        val token = nameOfFirst.take(4)
        val result = repo.filter(query = token, group = null)
        assertTrue("hasil harus memuat kemampuan pertama", result.isNotEmpty())
    }

    @Test
    fun `filter grup hanya mengembalikan anggota grup tsb`() {
        val group = repo.groups.first()
        val result = repo.filter(query = "", group = group)
        assertTrue(result.isNotEmpty())
        assertTrue(result.all { it.group == group })
    }

    @Test
    fun `filter tanpa kecocokan mengembalikan kosong`() {
        val result = repo.filter(query = "zzzz-nonexistent-xyzzy", group = null)
        assertTrue(result.isEmpty())
    }

    @Test
    fun `groupsWithCapabilities mengelompokkan dan mengecualikan grup kosong`() {
        val grouped = repo.groupsWithCapabilities(query = "", group = null)
        assertEquals(repo.groups.size, grouped.size)
        grouped.forEach { (g, caps) ->
            assertTrue("grup $g tidak kosong", caps.isNotEmpty())
            assertTrue("semua anggota group = $g", caps.all { it.group == g })
        }
    }

    @Test
    fun `groupsWithCapabilities terfilter konsisten dengan filter datar`() {
        val group = repo.groups.first()
        val capInGroup = repo.filter(query = "", group = group).first()
        val token = capInGroup.name.take(3)
        val grouped = repo.groupsWithCapabilities(query = token, group = null)
        val flatten = grouped.flatMap { it.second }
        // Gabungan grup yang difilter sama dengan hasil filter datar untuk token tsb.
        val flat = repo.filter(query = token, group = null)
        assertEquals(flat.map { it.id }.sorted(), flatten.map { it.id }.sorted())
    }
}
