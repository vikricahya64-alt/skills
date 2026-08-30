package com.vikri.gcpagent.di

import com.vikri.gcpagent.data.CapabilityRepository

/**
 * Dependency injection ringan (manual) — cukup untuk skala ini, tanpa membebani
 * build dengan framework. Setiap instance dibuat lazy & dibagikan (singleton).
 */
object ServiceLocator {

    val capabilityRepository: CapabilityRepository by lazy { CapabilityRepository() }
}
