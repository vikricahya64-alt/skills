package com.vikri.gcpagent

object Routes {
    const val HOME = "home"
    const val CAPABILITIES = "capabilities"
    const val AGENT = "agent"
    const val CAPABILITY_DETAIL = "capability/{capId}"

    fun capabilityDetail(capId: String): String = "capability/$capId"
}