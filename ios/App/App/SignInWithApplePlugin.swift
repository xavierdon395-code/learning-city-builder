import Foundation
import Capacitor
import AuthenticationServices
import UIKit
import CryptoKit

@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SignInWithApplePlugin"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?
    private var activeRawNonce: String?

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
        let rawNonce = randomNonceString()
        activeRawNonce = rawNonce

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(rawNonce)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    private func clearActiveCall() {
        activeCall = nil
        activeRawNonce = nil
    }

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length

        while remainingLength > 0 {
            var randoms: [UInt8] = Array(repeating: 0, count: 16)
            let errorCode = SecRandomCopyBytes(kSecRandomDefault, randoms.count, &randoms)
            if errorCode != errSecSuccess {
                fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
            }

            randoms.forEach { random in
                if remainingLength == 0 {
                    return
                }

                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }

        return result
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.map { String(format: "%02x", $0) }.joined()
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

        guard let rawNonce = activeRawNonce else {
            activeCall?.reject("未获取到 rawNonce。", "missing_raw_nonce")
            clearActiveCall()
            return
        }

        var payload: [String: Any] = [
            "identityToken": identityToken,
            "rawNonce": rawNonce
        ]

        if let email = appleCredential.email {
            payload["email"] = email
        }

        if let fullName = appleCredential.fullName {
            let name = PersonNameComponentsFormatter().string(from: fullName).trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty {
                payload["fullName"] = name
            }
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
