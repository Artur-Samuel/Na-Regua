import { StyleSheet, TextInput, TextInputProps } from "react-native"

export function Input(props: TextInputProps){
    return(
        <TextInput
            style={styles.input}
            placeholderTextColor="#999"
            {...props}
        />
    )
}

const styles = StyleSheet.create({
    input:{
        width:"100%",
        height:48,
        borderWidth:1,
        borderColor:"#DDD",
        borderRadius:8,
        paddingHorizontal:12,
        marginBottom:10
    }
})