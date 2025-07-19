import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import List "mo:base/List";

actor DocLocker {

  type Timestamp = Int;
  type WalletAddress = Text;
  type DesignHash = Text;

  // Stores design hash => (timestamp, wallet)
  var registry = HashMap.HashMap<DesignHash, (Timestamp, WalletAddress)>(100, Text.equal, Text.hash);

  // Stores alerts per user wallet
  var alerts = HashMap.HashMap<WalletAddress, List.List<Text>>(100, Text.equal, Text.hash);

  /// Uploads a new design. If already exists, returns existing timestamp.
  public func uploadDesign(hash: DesignHash, wallet: WalletAddress) : async Timestamp {
    switch (registry.get(hash)) {
      case (?entry) {
        // Already exists
        return entry.0;
      };
      case null {
        let now = Time.now();
        registry.put(hash, (now, wallet));
        return now;
      };
    };
  };

  /// Verifies a design hash. Returns timestamp and wallet address if found.
  public query func verifyDesign(hash: DesignHash) : async ?(Timestamp, WalletAddress) {
    return registry.get(hash);
  };

  /// INTERNAL: Called by AI scanner to report plagiarism.
  public func reportPlagiarism(originalHash: DesignHash, sourceUrl: Text) : async Text {
    switch (registry.get(originalHash)) {
      case (?(_, wallet)) {
        let currentAlerts = switch (alerts.get(wallet)) {
          case (?list) list;
          case null List.nil<Text>();
        };
        let updated = List.push("Potential plagiarism found: " # sourceUrl, currentAlerts);
        alerts.put(wallet, updated);
        return "Alert sent to wallet: " # wallet;
      };
      case null return "Hash not found.";
    };
  };

  /// Get all alerts for a designer wallet.
  public query func getAlerts(wallet: WalletAddress) : async [Text] {
    switch (alerts.get(wallet)) {
      case (?list) return List.toArray(list);
      case null return [];
    };
  };
}

