import Foundation
import Capacitor
import AuthenticationServices
import UIKit

@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SignInWithApplePlugin"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?

    @objc func signIn(_ call: CAPPluginCall) {
        if activeCall != nil {
            call.reject("已有登录请求正在进行。", "in_progress")
            return
        }

        guard #available(iOS 13.0, *) else {
            call.reject("当前 iOS 版本不支持 Sign in with Apple。", "unsupported_platform")
            return
        }

        activeCall = call

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    private func clearActiveCall() {
        activeCall = nil
    }
}

@available(iOS 13.0, *)
extension SignInWithApplePlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            activeCall?.reject("未获取到 Apple 登录凭证。", "invalid_credential")
            clearActiveCall()
            return
        }

        guard let tokenData = appleCredential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            activeCall?.reject("未获取到 identityToken。", "missing_identity_token")
            clearActiveCall()
            return
        }

        var payload: [String: Any] = [
            "identityToken": identityToken
        ]

        if let email = appleCredential.email {
            payload["email"] = email
        }

        activeCall?.resolve(payload)
        clearActiveCall()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let nsError = error as NSError
        if nsError.domain == ASAuthorizationError.errorDomain,
           nsError.code == ASAuthorizationError.canceled.rawValue {
            activeCall?.reject("用户取消登录。", "canceled")
            clearActiveCall()
            return
        }

        activeCall?.reject(error.localizedDescription, "apple_sign_in_failed")
        clearActiveCall()
    }
}

@available(iOS 13.0, *)
extension SignInWithApplePlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let bridgeWindow = bridge?.viewController?.view.window {
            return bridgeWindow
        }

        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let keyWindow = scene.windows.first(where: { $0.isKeyWindow }) {
            return keyWindow
        }

        return UIWindow()
    }
}
