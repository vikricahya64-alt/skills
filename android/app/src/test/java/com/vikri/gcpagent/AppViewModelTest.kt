package com.vikri.gcpagent

import com.vikri.gcpagent.data.CapabilityRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit test (JVM) untuk AppViewModel — memvalidasi transisi state UI
 * (pencarian, filter grup, refresh loading) tanpa emulator, di quality-gate CI.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AppViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `state awal: query kosong dan tidak ada grup terpilih`() {
        val vm = AppViewModel(CapabilityRepository())
        assertNull(vm.uiState.value.selectedGroup)
        assertEquals("", vm.uiState.value.searchQuery)
        assertEquals(vm.totalCapabilities, vm.filteredCapabilities.size)
    }

    @Test
    fun `setSearchQuery membatasi hasil filter`() {
        val vm = AppViewModel(CapabilityRepository())
        val first = vm.allCapabilities.first()
        vm.setSearchQuery(first.name.take(4))
        assertTrue("harus ada hasil", vm.filteredCapabilities.isNotEmpty())
    }

    @Test
    fun `selectGroup menyaring sesuai grup`() {
        val vm = AppViewModel(CapabilityRepository())
        val group = vm.groups.first()
        vm.selectGroup(group)
        assertEquals(group, vm.uiState.value.selectedGroup)
        assertTrue(vm.filteredCapabilities.isNotEmpty())
        assertTrue(vm.filteredCapabilities.all { it.group == group })
    }

    @Test
    fun `selectGroup null menampilkan semua`() {
        val vm = AppViewModel(CapabilityRepository())
        vm.selectGroup(null)
        assertEquals(vm.totalCapabilities, vm.filteredCapabilities.size)
    }

    @Test
    fun `refreshCapabilities memicu loading lalu kembali selesai`() = runTest(dispatcher) {
        val vm = AppViewModel(CapabilityRepository())
        assertFalse(vm.uiState.value.capabilitiesLoading)
        vm.refreshCapabilities()
        assertTrue("loading aktif saat refresh", vm.uiState.value.capabilitiesLoading)
        advanceUntilIdle()
        assertFalse("loading selesai setelah refresh", vm.uiState.value.capabilitiesLoading)
    }

    @Test
    fun `refreshCapabilities mengabaikan panggilan bertumpuk`() = runTest(dispatcher) {
        val vm = AppViewModel(CapabilityRepository())
        vm.refreshCapabilities()
        vm.refreshCapabilities()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.capabilitiesLoading)
    }
}
