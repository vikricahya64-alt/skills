package com.vikri.gcpagent

import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.vikri.gcpagent.ui.AppViewModel
import com.vikri.gcpagent.R

private data class Tab(
    val route: String,
    @androidx.annotation.StringRes val labelRes: Int,
    val icon: ImageVector
)

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun AgenGCPApp(viewModel: AppViewModel = viewModel(factory = AppViewModel.Factory)) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val tabs = listOf(
        Tab(Routes.HOME, R.string.nav_home, Icons.Filled.Home),
        Tab(Routes.CAPABILITIES, R.string.nav_capabilities, Icons.Filled.GridView),
        Tab(Routes.AGENT, R.string.nav_web, Icons.Filled.Public)
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                tabs.forEach { tab ->
                    val selected = currentRoute == tab.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = { navController.navigateTo(tab.route) },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(stringResource(tab.labelRes)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onSurface,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        val mod = Modifier
            .fillMaxSize()
            .padding(innerPadding)

        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = mod,
            enterTransition = {
                slideInHorizontally(
                    initialOffsetX = { it / 4 },
                    animationSpec = tween(320, easing = FastOutSlowInEasing)
                ) + fadeIn(tween(320))
            },
            exitTransition = {
                fadeOut(animationSpec = tween(220))
            },
            popEnterTransition = {
                fadeIn(animationSpec = tween(320))
            },
            popExitTransition = {
                slideOutHorizontally(
                    targetOffsetX = { it / 4 },
                    animationSpec = tween(220, easing = FastOutSlowInEasing)
                ) + fadeOut(tween(220))
            }
        ) {
            composable(
                route = Routes.HOME,
                deepLinks = listOf(navDeepLink { uriPattern = "vikriagent://home" })
            ) {
                HomeScreen(
                    modifier = Modifier,
                    viewModel = viewModel,
                    onOpenCapabilities = { navController.navigateTo(Routes.CAPABILITIES) }
                )
            }
            composable(
                route = Routes.CAPABILITIES,
                deepLinks = listOf(navDeepLink { uriPattern = "vikriagent://capabilities" })
            ) {
                CapabilitiesScreen(
                    modifier = Modifier,
                    viewModel = viewModel,
                    onOpenDetail = { capId ->
                        navController.navigate(Routes.capabilityDetail(capId))
                    }
                )
            }
            composable(
                route = Routes.CAPABILITY_DETAIL,
                arguments = listOf(
                    navArgument("capId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val capId = backStackEntry.arguments?.getString("capId").orEmpty()
                CapabilityDetailScreen(
                    modifier = Modifier,
                    viewModel = viewModel,
                    capId = capId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(
                route = Routes.AGENT,
                deepLinks = listOf(navDeepLink { uriPattern = "vikriagent://agent" })
            ) {
                WebScreen(modifier = Modifier, viewModel = viewModel)
            }
        }
    }
}

private fun androidx.navigation.NavHostController.navigateTo(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}