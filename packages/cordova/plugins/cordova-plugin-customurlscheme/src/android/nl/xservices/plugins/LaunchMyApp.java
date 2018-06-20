package nl.xservices.plugins;

import android.content.Intent;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;

import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.util.Locale;

public class LaunchMyApp extends CordovaPlugin {

  private static final String ACTION_CHECKINTENT = "checkIntent";
  private static final String ACTION_CLEARINTENT = "clearIntent";
  private static final String ACTION_GETLASTINTENT = "getLastIntent";

  private String lastIntentString = null;

  /**
   * We don't want to interfere with other plugins requiring the intent data,
   * but in case of a multi-page app your app may receive the same intent data
   * multiple times, that's why you'll get an option to reset it (null it).
   *
   * Add this to config.xml to enable that behaviour (default false):
   *   <preference name="CustomURLSchemePluginClearsAndroidIntent" value="true"/>
   */
  private boolean resetIntent;

  @Override
  public void initialize(final CordovaInterface cordova, CordovaWebView webView){
    this.resetIntent = preferences.getBoolean("resetIntent", false) ||
        preferences.getBoolean("CustomURLSchemePluginClearsAndroidIntent", false);
  }

  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    if (ACTION_CLEARINTENT.equalsIgnoreCase(action)) {
      final Intent intent = ((CordovaActivity) this.webView.getContext()).getIntent();
      if (resetIntent){
        intent.setData(null);
      }
      return true;
    } else if (ACTION_CHECKINTENT.equalsIgnoreCase(action)) {
      final Intent intent = ((CordovaActivity) this.webView.getContext()).getIntent();
      final String intentString = intent.getDataString();
      if (intentString != null && intent.getScheme() != null) {
        lastIntentString = intentString;
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, intent.getDataString()));
      } else {
        callbackContext.error("App was not started via the launchmyapp URL scheme. Ignoring this errorcallback is the best approach.");
      }
      return true;
    } else if (ACTION_GETLASTINTENT.equalsIgnoreCase(action)) {
      if(lastIntentString != null) {
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, lastIntentString));
      } else {
        callbackContext.error("No intent received so far.");
      }
      return true;
    } else {
      callbackContext.error("This plugin only responds to the " + ACTION_CHECKINTENT + " action.");
      return false;
    }
  }

  @Override
  public void onNewIntent(Intent intent) {
    final String intentString = intent.getDataString();
    if (intentString != null && intent.getScheme() != null) {
      if (resetIntent){
        intent.setData(null);
      }
      try {
        StringWriter writer = new StringWriter(intentString.length() * 2);
        escapeJavaStyleString(writer, intentString, true, false);
        webView.loadUrl("javascript:handleOpenURL('" + writer.toString() + "');");
      } catch (IOException ignore) {
      }
    }
  }

  // Taken from commons StringEscapeUtils
  private static void escapeJavaStyleString(Writer out, String str, boolean escapeSingleQuote,
                                            boolean escapeForwardSlash) throws IOException {
    if (out == null) {
      throw new IllegalArgumentException("The Writer must not be null");
    }
    if (str == null) {
      return;
    }
    int sz;
    sz = str.length();
    for (int i = 0; i < sz; i++) {
      char ch = str.charAt(i);

      // handle unicode
      if (ch > 0xfff) {
        out.write("\\u" + hex(ch));
      } else if (ch > 0xff) {
        out.write("\\u0" + hex(ch));
      } else if (ch > 0x7f) {
        out.write("\\u00" + hex(ch));
      } else if (ch < 32) {
        switch (ch) {
          case '\b':
            out.write('\\');
            out.write('b');
            break;
          case '\n':
            out.write('\\');
            out.write('n');
            break;
          case '\t':
            out.write('\\');
            out.write('t');
            break;
          case '\f':
            out.write('\\');
            out.write('f');
            break;
          case '\r':
            out.write('\\');
            out.write('r');
            break;
          default:
            if (ch > 0xf) {
              out.write("\\u00" + hex(ch));
            } else {
              out.write("\\u000" + hex(ch));
            }
            break;
        }
      } else {
        switch (ch) {
          case '\'':
            if (escapeSingleQuote) {
              out.write('\\');
            }
            out.write('\'');
            break;
          case '"':
            out.write('\\');
            out.write('"');
            break;
          case '\\':
            out.write('\\');
            out.write('\\');
            break;
          case '/':
            if (escapeForwardSlash) {
              out.write('\\');
            }
            out.write('/');
            break;
          default:
            out.write(ch);
            break;
        }
      }
    }
  }

  private static String hex(char ch) {
    return Integer.toHexString(ch).toUpperCase(Locale.ENGLISH);
  }
}
