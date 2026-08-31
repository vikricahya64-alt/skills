package com.vikri.gcpagent

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vikri.gcpagent.R
import com.vikri.gcpagent.ui.AGEN_URL
import com.vikri.gcpagent.ui.AppViewModel

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebScreen(
    modifier: Modifier = Modifier,
    viewModel: AppViewModel = viewModel(factory = AppViewModel.Factory)
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var canGoBack by remember { mutableStateOf(false) }
    var canGoForward by remember { mutableStateOf(false) }

    val webView = remember {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            settings.builtInZoomControls = true
            settings.displayZoomControls = false

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    viewModel.setWebLoading(true)
                    viewModel.setWebProgress(5)
                    viewModel.setWebError(null)
                }
                override fun onPageFinished(view: WebView?, url: String?) {
                    viewModel.setWebLoading(false)
                    viewModel.setWebProgress(100)
                    canGoBack = view?.canGoBack() == true
                    canGoForward = view?.canGoForward() == true
                }
                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        viewModel.setWebError(
                            error?.description?.toString()
                                ?: context.getString(R.string.web_error_generic)
                        )
                        viewModel.setWebLoading(false)
                        viewModel.setWebProgress(0)
                    }
                }
                override fun onReceivedSslError(
                    view: WebView?,
                    handler: SslErrorHandler?,
                    error: SslError?
                ) {
                    handler?.cancel()
                    viewModel.setWebError(context.getString(R.string.web_error_ssl))
                    viewModel.setWebLoading(false)
                    viewModel.setWebProgress(0)
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    viewModel.setWebProgress(newProgress.coerceIn(0, 100))
                    if (newProgress >= 100) {
                        viewModel.setWebLoading(false)
                        canGoBack = view?.canGoBack() == true
                        canGoForward = view?.canGoForward() == true
                    }
                }
            }
            loadUrl(AGEN_URL)
        }
    }

    BackHandler(enabled = canGoBack) {
        if (webView.canGoBack()) {
            webView.goBack()
        }
    }

    LaunchedEffect(uiState.webReloadTick) {
        if (uiState.webReloadTick > 0) {
            webView.reload()
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(stringResource(R.string.app_name)) },
            navigationIcon = {
                IconButton(onClick = {
                    if (canGoBack) webView.goBack() else viewModel.setWebError(null)
                }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = stringResource(R.string.web_back)
                    )
                }
            },
            actions = {
                IconButton(onClick = { viewModel.refreshWeb() }) {
                    Icon(
                        imageVector = Icons.Filled.Refresh,
                        contentDescription = stringResource(R.string.web_retry)
                    )
                }
                IconButton(onClick = {
                    context.startActivity(
                        android.content.Intent(Intent.ACTION_VIEW, Uri.parse(AGEN_URL))
                    )
                }) {
                    Icon(
                        imageVector = Icons.Filled.OpenInBrowser,
                        contentDescription = stringResource(R.string.home_open)
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        // Progress bar determinate berdasarkan kemajuan halaman.
        if (uiState.webLoading) {
            LinearProgressIndicator(
                progress = { uiState.webProgress / 100f },
                modifier = Modifier.fillMaxWidth()
            )
        }

        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            AndroidView(
                factory = { webView },
                modifier = Modifier.fillMaxSize()
            )

            uiState.webError?.let { error ->
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.ErrorOutline,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(56.dp)
                    )
                    Text(
                        text = error,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Button(onClick = { viewModel.refreshWeb() }) {
                        Icon(Icons.Filled.Refresh, contentDescription = null)
                        Text(
                            stringResource(R.string.web_retry),
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                }
            }
        }
    }
}