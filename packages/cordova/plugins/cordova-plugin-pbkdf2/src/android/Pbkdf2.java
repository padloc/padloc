package com.maklesoft.cordova;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;

import org.json.JSONArray;
import org.json.JSONException;

import android.util.Log;
import android.util.Base64;

import de.rtner.security.auth.spi.PBKDF2Parameters;
import de.rtner.security.auth.spi.PBKDF2Engine;

public class Pbkdf2 extends CordovaPlugin {

    @Override
    public boolean execute(String action, final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        if (action.equals("genKey")) {
            cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    try {
                        String passphrase = args.getString(0);
                        byte[] salt = Base64.decode(args.getString(1), Base64.DEFAULT);
                        Integer iter = args.getInt(2);
                        Integer size = args.getInt(3);

                        if (size != 256 && size != 512) {
                            throw new Exception("Unsupported key size");
                        }

                        if (iter < 0) {
                            throw new Exception("Iteration count needs to be a positive number");
                        }

                        PBKDF2Parameters p = new PBKDF2Parameters("HmacSHA256", "UTF-8", salt, iter);
                        byte[] key = new PBKDF2Engine(p).deriveKey(passphrase);

                        callbackContext.success(Base64.encodeToString(key, Base64.DEFAULT));

                    } catch (Exception e) {
                        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, e.toString()));
                    }
                }
            });

            return true;
        }

        return false;
    }
}


